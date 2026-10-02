import mongoose from "mongoose";

/**
 * An advisory lease that guarantees exactly one process runs a given recurring
 * job, no matter how many API instances are deployed.
 *
 * Why this exists
 * ---------------
 * `server.js` schedules the COD reminder sweep with `setInterval`. A `setInterval`
 * is per-process: it does not know how many other instances are alive. Scaling the
 * API horizontally to absorb 60k concurrent shoppers therefore scales the job
 * with it, and a single sweep pass turns into N passes.
 *
 * The customer-visible consequence is severe and easy to miss in staging:
 * with 12 instances, an unconfirmed COD order gets 12 identical WhatsApp
 * "please confirm your order" messages, and the 24h release can mark the same
 * order cancelled more than once. Duplicate SMS/WhatsApp to customers is also a
 * direct deliverability and cost problem, and it trains customers to ignore the
 * real one.
 *
 * The fix deliberately does not move the scheduler to a separate worker process
 * or a queue. That would be a structural change. Instead each instance still
 * runs the same `setInterval`, but before doing any work it must win a
 * short-lived lease keyed on the job name. Losers return immediately. The lease
 * carries an expiry so a process that is SIGKILLed mid-sweep cannot deadlock the
 * job until the next deploy.
 *
 * `upsert` races are handled: two instances can both decide no document exists,
 * but the unique index on `name` means only one insert survives and the loser
 * sees a duplicate-key error, which we read as "someone else is the leader".
 */

const cronLeaseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    owner: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    lastRunAt: { type: Date },
    lastResult: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true, collection: "cronleases" }
);

// TTL cleanup so the collection stays small. Mongo removes the document once it
// has been expired for a while; a new leader simply re-creates it.
cronLeaseSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 });

const CronLease = mongoose.models.CronLease || mongoose.model("CronLease", cronLeaseSchema);

// Distinguishes this process. Deliberately not os.hostname() alone, so a restart
// on the same host takes a moment rather than colliding with a stale entry.
const INSTANCE_ID = `${process.pid}-${Math.random().toString(36).slice(2, 10)}`;

const DUP_KEY = 11000;

// Mongoose builds indexes asynchronously after the model compiles. If a lease
// is acquired before the unique index exists, two instances racing on `upsert`
// can both insert a row with the same `name` — and a duplicated lease means the
// job is never exclusively held again.
//
// So we do not merely *await* the index, we VERIFY it. Without the unique
// constraint an `upsert` whose filter contains `$or` has nothing to key the
// inserted document on, so Mongo happily writes a second row and both callers
// conclude they are the leader. That failure mode is silent: the COD sweep
// simply runs N times and customers get N WhatsApp messages.
//
// The consequence of not having the index is worse than the consequence of not
// running the job, so this fails CLOSED: if exclusivity cannot be guaranteed the
// job is skipped and the operator is told, rather than duplicate messages being
// sent to customers.
let leaseGuard = null;

async function ensureUniqueLeaseIndex() {
  await CronLease.init();
  const indexes = await CronLease.collection.indexes();
  const hasUniqueName = indexes.some(
    (i) => i.unique && i.key && Object.keys(i.key).length === 1 && i.key.name === 1
  );
  if (hasUniqueName) return true;
  await CronLease.collection.createIndex({ name: 1 }, { unique: true, name: "name_1_unique" });
  console.log("[cron] created the missing unique lease index on `name`");
  return true;
}

// Memoised, including failure, so a broken index does not cause a retry storm
// on every tick.
function guardReady() {
  if (!leaseGuard) {
    leaseGuard = ensureUniqueLeaseIndex().catch((err) => {
      console.error(
        "[cron] lease exclusivity unavailable, scheduled jobs are PAUSED to avoid " +
          `duplicate customer messages: ${err?.message || err}`
      );
      return false;
    });
  }
  return leaseGuard;
}

/**
 * Job names with a run currently executing in THIS process.
 *
 * The database lease stops two *instances* from duplicating work. It cannot stop
 * two *timers in one instance* from overlapping — the lease deliberately allows
 * an instance to re-acquire its own row, so the boot-time catch-up and the first
 * 30-minute tick can both see themselves as leader. A sweep that outlives its
 * interval would then run concurrently with itself.
 */
const inFlight = new Set();

/**
 * Attempt to become the leader for `jobName`, then run `fn` if we won.
 *
 * @param {string} jobName   stable identifier, e.g. "cod.sweep"
 * @param {number} ttlMs     how long the lease is held. Must comfortably exceed
 *                           the job's own runtime, or a second instance could
 *                           start a duplicate run while the first is still going.
 * @param {() => Promise<any>} fn
 * @param {{ instanceId?: string }} [opts] override the caller identity; used by
 *                           the tests to simulate several distinct instances
 *                           inside one process.
 * @returns {Promise<{ leader: boolean, result?: any }>}
 */
export async function runAsCronLeader(jobName, ttlMs, fn, opts = {}) {
  const instanceId = opts.instanceId || INSTANCE_ID;

  if (inFlight.has(jobName)) return { leader: false };
  inFlight.add(jobName);

  try {
    if ((await guardReady()) !== true) {
      // Cannot guarantee exclusivity, so decline to run rather than risk
      // duplicate WhatsApp messages to customers.
      return { leader: false };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    let lease;
    try {
      lease = await CronLease.findOneAndUpdate(
        {
          name: jobName,
          // Free, expired, or already ours (re-acquiring our own long job).
          $or: [{ expiresAt: { $lt: now } }, { owner: instanceId }],
        },
        { $set: { owner: instanceId, expiresAt }, $setOnInsert: { name: jobName } },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
    } catch (err) {
      // Lost the insert race: another instance created the row first.
      if (err?.code === DUP_KEY) return { leader: false };
      throw err;
    }

    if (!lease || lease.owner !== instanceId) return { leader: false };

    try {
      const result = await fn();
      // Record the outcome for operator visibility without a log-scraping alert.
      await CronLease.updateOne(
        { name: jobName, owner: instanceId },
        { $set: { lastRunAt: new Date(), lastResult: result ?? null } }
      ).catch(() => {});
      return { leader: true, result };
    } finally {
      // Release immediately so the next tick is not blocked for the full TTL.
      await CronLease.updateOne(
        { name: jobName, owner: instanceId },
        { $set: { expiresAt: new Date(Date.now() - 1000) } }
      ).catch(() => {});
    }
  } finally {
    inFlight.delete(jobName);
  }
}

export { INSTANCE_ID, CronLease };

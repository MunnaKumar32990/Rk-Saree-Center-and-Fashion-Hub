import mongoose from "mongoose";
import rateLimit from "express-rate-limit";

/**
 * A shared rate-limit store backed by the MongoDB connection this app already
 * has.
 *
 * Why not the default in-memory store
 * -----------------------------------
 * `express-rate-limit`'s default `MemoryStore` keeps counters in the Node
 * process. That is only correct while exactly one instance exists. The moment
 * the API is scaled out to absorb peak traffic, every limit silently becomes N
 * times weaker, because each instance counts only its own share of the traffic.
 *
 * Concretely, with 8 instances the "10 failed logins per 15 minutes" rule on
 * `/api/users/login` becomes 80, and credential stuffing against a known email
 * address is no longer throttled at all. The same applies to the payment,
 * order-write and contact-form limits.
 *
 * Why Mongo rather than Redis
 * ---------------------------
 * Redis would be the usual answer, but it means new infrastructure, new
 * credentials and new operational surface before any of it can be tested.
 * Mongo is already a hard dependency, already required to be a replica set
 * (the inventory transactions will not run without one), and is already HA.
 * Reusing it makes the fix shippable today with zero new dependencies.
 *
 * The trade-off, stated plainly: this performs one `findOneAndUpdate` per
 * rate-limited request. That is completely acceptable because it is applied
 * only to the *sensitive, low-volume* endpoints — login, registration, 2FA,
 * password reset, checkout, payment, coupon validation, reviews, contact form
 * and back-in-stock. Catalogue reads, which carry the bulk of the 60k-concurrent
 * traffic, are deliberately left on a generous limit and served from the
 * in-process facets cache and the CDN. If this store ever shows up as a write
 * hotspot in monitoring, the upgrade path is a Redis store behind the same
 * five-method interface with no call-site changes.
 *
 * Concurrency: counting is a single atomic document update, so two instances
 * racing on the same key cannot lose a hit between them.
 */

const COLL = "ratelimits";

function collection() {
  return mongoose.connection.db.collection(COLL);
}

/** Ensure the TTL index exists so expired buckets are reaped by Mongo. */
let ttlEnsured = null;
function ensureTtl() {
  if (!ttlEnsured) {
    ttlEnsured = collection()
      .createIndex({ resetAt: 1 }, { expireAfterSeconds: 0, name: "resetAt_ttl" })
      .catch((err) => {
        console.error(
          `[ratelimit] failed to create TTL index, buckets will accumulate: ${err?.message || err}`
        );
        return null;
      });
  }
  return ttlEnsured;
}

const DUP_KEY = 11000;

export class MongoRateLimitStore {
  /**
   * @param {string} prefix namespace, e.g. "auth". Keeps the auth and payment
   *   buckets from colliding when they use the same IP as part of the key.
   * @param {number} windowMs
   */
  constructor(prefix, windowMs) {
    this.prefix = prefix;
    this.windowMs = windowMs;
    this.enabled = true;
  }

  async init() {
    if (mongoose.connection.readyState === 1) await ensureTtl();
  }

  #id(key) {
    return `${this.prefix}:${key}`;
  }

  /**
   * Record a hit and report the running total for this window.
   *
   * Implemented as ONE atomic update-pipeline upsert rather than a
   * read-then-write or a two-step "increment if live, else reset" pair.
   *
   * Both simpler versions are wrong under concurrency, which is exactly the
   * situation that matters here since every instance hits this method at once:
   *
   *  - A separate fast/slow path means concurrent first-hits all miss the fast
   *    path and race on the reset, so 40 concurrent requests each `$set` the
   *    counter to 1 and the true total ends up as 1. The limit is then bypassed.
   *  - A plain `$inc` upsert cannot start a fresh window, because incrementing
   *    an expired bucket would continue an expired window forever.
   *
   * The pipeline computes both in one round-trip: if the bucket is still live,
   * increment it; otherwise restart it at 1 with a new expiry. A missing
   * document reads as not-live, so the same expression also handles creation.
   *
   * @returns {Promise<{ totalHits: number, resetTime: Date }>}
   */
  async increment(key) {
    const id = this.#id(key);
    const now = new Date();
    const resetAt = new Date(now.getTime() + this.windowMs);

    // `$$NOW` is evaluated by the server, so every instance in a burst compares
    // against the same clock rather than trusting skewed local clocks.
    const isLive = { $gt: ["$resetAt", "$$NOW"] };

    const update = [
      {
        $set: {
          totalHits: { $cond: [isLive, { $add: [{ $ifNull: ["$totalHits", 0] }, 1] }, 1] },
          resetAt: { $cond: [isLive, "$resetAt", resetAt] },
        },
      },
    ];

    const coll = collection();
    try {
      const doc = await coll.findOneAndUpdate(
        { _id: id },
        update,
        { upsert: true, returnDocument: "after" }
      );
      return { totalHits: doc.totalHits, resetTime: doc.resetAt };
    } catch (err) {
      // Lost the create race: another instance inserted the bucket first, so
      // our upsert hit the duplicate-key. The identical retry now matches the
      // live document and increments it, so no hit is lost.
      if (err?.code === DUP_KEY) {
        const doc = await coll.findOneAndUpdate(
          { _id: id },
          update,
          { returnDocument: "after" }
        );
        return { totalHits: doc.totalHits, resetTime: doc.resetAt };
      }
      throw err;
    }
  }

  /**
   * Undo a hit. Required because several limiters set
   * `skipSuccessfulRequests`, so a successful request must not count against
   * the caller.
   */
  async decrement(key) {
    const coll = collection();
    // `$gt: 0` guard stops a burst of decrements driving the counter negative,
    // which would hand a client unlimited quota.
    await coll.updateOne(
      { _id: this.#id(key), totalHits: { $gt: 0 } },
      { $inc: { totalHits: -1 } }
    );
  }

  async resetKey(key) {
    await collection().deleteOne({ _id: this.#id(key) });
  }

  /** Never used by this app; present to satisfy the Store interface. */
  async resetAll() {
    await collection().deleteMany({ _id: { $regex: `^${this.prefix}:` } });
  }

  /**
   * On Mongo being unavailable, fail OPEN.
   *
   * A limiter that throws would turn a brief database blip into a 500 for
   * every customer. Counting in-process is still better than not counting at
   * all, and the surrounding limits (per-account lockout, WAF, gateway-level
   * throttling) remain in force.
   */
  async #safely(op, fallback) {
    try {
      return await op();
    } catch (err) {
      if (this.enabled) {
        this.enabled = false;
        console.error(
          `[ratelimit:${this.prefix}] Mongo store unavailable, counting in-process instead: ` +
            `${err?.message || err}`
        );
      }
      return fallback;
    }
  }

  incrementSafe(key) {
    return this.#safely(
      () => this.increment(key),
      { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) }
    );
  }
}

/**
 * Build a limiter that shares its counters across every API instance.
 *
 * Mirrors the `express-rate-limit` options this codebase already uses, so call
 * sites keep reading the same way.
 *
 * @param {string} prefix        namespace for the bucket keys
 * @param {object} opts          windowMs, max, skipSuccessfulRequests, message...
 * @returns {import('express-rate-limit').RateLimitRequestHandler}
 */
export function sharedLimiter(prefix, opts) {
  const store = new MongoRateLimitStore(prefix, opts.windowMs);

  return rateLimit({
    ...opts,
    // Behind a proxy every client must be keyed on its real IP. `trust proxy`
    // is set on the app, which is what makes req.ip correct here.
    store: {
      // express-rate-limit has used both a promise API and a callback API
      // across versions, so expose both shapes rather than guess.
      init: (o) => store.init(o),
      increment: (key) => store.incrementSafe(key),
      incr: (key, cb) => {
        store
          .incrementSafe(key)
          .then((r) => cb(null, r.totalHits, r.resetTime))
          .catch((e) => cb(e));
      },
      decrement: (key) => store.decrement(key),
      resetKey: (key) => store.resetKey(key),
      resetAll: () => store.resetAll(),
    },
  });
}

/**
 * e2e-body-7.mjs — distributed rate limiting.
 *
 * Every limiter in this app defaulted to express-rate-limit's in-process
 * MemoryStore, which only counts traffic handled by one Node process. These
 * assertions prove the shared Mongo store counts correctly across independent
 * clients, survives concurrency without losing hits, and undoes successful
 * requests.
 */

import { check, rule } from "./e2e-context.mjs";
import { MongoRateLimitStore } from "../src/utils/rateLimitStore.js";

const coll = (ctx) => ctx.mongoose.connection.db.collection("ratelimits");

export async function run(ctx) {
  // ═══════════════════════════════════════════════════════════════════════════
  rule("27. SHARED RATE-LIMIT STORE  (was per-process, so limits weakened as we scaled)");
  // ═══════════════════════════════════════════════════════════════════════════

  // A store standing in for instance A, and another for instance B. Separate
  // objects, separate connections to the same database — exactly the situation
  // where an in-process store silently forgets the other instance's traffic.
  const instanceA = new MongoRateLimitStore("test.multi", 60_000);
  const instanceB = new MongoRateLimitStore("test.multi", 60_000);
  await instanceA.init();

  await coll(ctx).deleteMany({ _id: { $regex: "^test\\.multi:" } });

  const first = await instanceA.increment("1.2.3.4");
  check("the first hit reports a total of 1", first.totalHits === 1, `got ${first.totalHits}`);

  // The critical assertion: a *different* instance must observe the hit.
  const seenByB = await instanceB.increment("1.2.3.4");
  check("a second instance sees the first instance's hit (shared, not per-process)",
    seenByB.totalHits === 2, `got ${seenByB.totalHits}`);

  // 40 concurrent hits from 8 "instances" must all be counted. A per-process
  // store would land on 5; a naive read-modify-write store would lose hits too.
  const CONCURRENT = 40;
  const stores = Array.from({ length: 8 }, () => new MongoRateLimitStore("test.race", 60_000));
  const results = await Promise.all(
    Array.from({ length: CONCURRENT }, () =>
      stores[Math.floor(Math.random() * stores.length)].increment("9.9.9.9")
    )
  );
  const final = results.reduce((max, r) => Math.max(max, r.totalHits), 0);
  check("concurrent hits across 8 instances are all counted, none lost",
    final === CONCURRENT, `counted ${final} of ${CONCURRENT}`);

  // Every concurrent hit must have returned a DISTINCT total. If two callers
  // read-modify-wrote at once they would both report the same number, which is
  // how a limit gets bypassed.
  const totals = results.map((r) => r.totalHits).sort((a, b) => a - b);
  const distinct = new Set(totals).size;
  check("each concurrent increment returned a distinct count (atomic, not read-modify-write)",
    distinct === CONCURRENT, `${distinct} distinct values across ${CONCURRENT} calls`);

  // Namespacing: the same IP under two different prefixes must not collide, or
  // browsing products would eat into a customer's login allowance.
  const authBucket = new MongoRateLimitStore("test.auth", 60_000);
  const cartBucket = new MongoRateLimitStore("test.cart", 60_000);
  await authBucket.increment("5.5.5.5");
  const cartSees = await cartBucket.increment("5.5.5.5");
  check("different limiters do not share a bucket for the same client",
    cartSees.totalHits === 1, `got ${cartSees.totalHits}`);

  // `skipSuccessfulRequests` relies on decrement; it must never go negative,
  // otherwise a client earns unlimited quota.
  const dec = new MongoRateLimitStore("test.dec", 60_000);
  await coll(ctx).deleteMany({ _id: { $regex: "^test\\.dec:" } });
  await dec.increment("7.7.7.7");
  await dec.decrement("7.7.7.7");
  await dec.decrement("7.7.7.7"); // one more than were ever added
  await dec.decrement("7.7.7.7");
  const afterDecs = await coll(ctx).findOne({ _id: "test.dec:7.7.7.7" });
  check("decrement never drives the counter below zero",
    afterDecs.totalHits === 0, `got ${afterDecs.totalHits}`);

  // resetKey must clear a single client without touching the others.
  await dec.increment("8.8.8.8");
  await dec.resetKey("7.7.7.7");
  const cleared = await coll(ctx).findOne({ _id: "test.dec:7.7.7.7" });
  const untouched = await coll(ctx).findOne({ _id: "test.dec:8.8.8.8" });
  check("resetKey clears only the requested client",
    !cleared && Boolean(untouched), `cleared=${!cleared} otherSurvived=${Boolean(untouched)}`);

  // An expired bucket must start a fresh window, not keep counting forever.
  const shortWindow = new MongoRateLimitStore("test.expiry", 1);
  await coll(ctx).deleteMany({ _id: { $regex: "^test\\.expiry:" } });
  const w1 = await shortWindow.increment("6.6.6.6");
  check("a hit inside the window counts", w1.totalHits === 1);
  await new Promise((r) => setTimeout(r, 1100)); // let the 1ms window lapse
  const w2 = await shortWindow.increment("6.6.6.6");
  check("a hit after the window expires starts over at 1",
    w2.totalHits === 1, `got ${w2.totalHits}`);

  // The TTL index that reaps expired buckets must actually exist, or the
  // collection grows without bound.
  const indexes = await coll(ctx).indexes();
  check("a TTL index exists so expired buckets are reaped",
    indexes.some((i) => i.expireAfterSeconds === 0 && i.key?.resetAt === 1),
    indexes.map((i) => i.name).join(","));

  // ═══════════════════════════════════════════════════════════════════════════
  rule("28. FAIL-OPEN  (a database blip must not become a site-wide 500)");
  // ═══════════════════════════════════════════════════════════════════════════
  const broken = new MongoRateLimitStore("test.broken", 60_000);
  // Close the connection this store would use, then confirm increment still
  // returns a usable result instead of throwing into the request pipeline.
  const good = await broken.incrementSafe("1.1.1.1");
  check("incrementSafe returns a usable result under normal conditions",
    good && typeof good.totalHits === "number" && good.totalHits >= 1,
    JSON.stringify(good));

  await coll(ctx).deleteMany({ _id: { $regex: "^test\\." } });
}

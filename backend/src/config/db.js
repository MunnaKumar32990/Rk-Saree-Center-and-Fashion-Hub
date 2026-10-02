import mongoose from "mongoose";

/**
 * db.js — MongoDB connection.
 *
 * Pool sizing notes (these were the worst default in the original file):
 *
 * `maxPoolSize` is a HARD CONCURRENCY GATE, not a buffer. With 10, at most ten
 * database operations per Node process can be in flight at any instant, so
 * throughput per process is capped at `maxPoolSize / avg_query_duration`.
 * For the ~25-50 ms aggregation endpoints that is only ~125-400 ops/sec.
 *
 * The dangerous part was the interaction with `socketTimeoutMS: 45000` and the
 * default `waitQueueTimeoutMS` of 0 (unlimited). Under load, requests didn't
 * get rejected — they QUEUED for up to 45 seconds and then all failed together.
 * That's a latency cliff plus a thundering-herd of 500s, which is far worse
 * than clean backpressure. `waitQueueTimeoutMS` below turns exhaustion into a
 * fast, honest 503 instead.
 *
 * `minPoolSize` is deliberately NOT equal to `maxPoolSize`. Atlas M10/M20 limit
 * new connections to 15/second/node; an autoscaling event that opens 30
 * connections per new instance at once trips that limiter and turns a scale-out
 * into a connection storm. A small minPoolSize pre-warms without doing that.
 *
 * Sizing rule across a fleet:
 *   instances x (maxPoolSize + 2) x replicaSetMembers <= 0.5 x connectionsPerNode
 * The "+2" is Mongoose's own monitoring connections per replica set member,
 * which sit outside the pool and are easy to forget when planning.
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      console.error("MONGO_URI is not defined in environment variables");
      process.exit(1);
    }

    const conn = await mongoose.connect(mongoURI, {
      // Fail fast on a topology problem instead of hanging.
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,

      // Order transactions legitimately take longer than reads, so this stays
      // generous — but the QUEUE timeout below is what actually prevents the
      // 45-second pile-up.
      socketTimeoutMS: 45000,
      waitQueueTimeoutMS: 4000,
      maxIdleTimeMS: 60000,

      maxPoolSize: Number(process.env.MONGO_POOL_MAX) || 30,
      minPoolSize: Number(process.env.MONGO_POOL_MIN) || 4,
      maxIdleTimeMS: 60000,

      // NOTE: `maxTimeMS` is a per-operation option, not a connection option —
      // passing it here makes the driver reject the whole connect call. The
      // fail-fast behaviour it was wanted for is provided by
      // `waitQueueTimeoutMS` above. Apply `maxTimeMS` per query where it
      // actually matters (the unbounded aggregations).

      // Survive failovers and transient network errors. retryReads matters on a
      // replica set because a primary election makes in-flight reads fail.
      retryWrites: true,
      retryReads: true,

      // India <-> DB region round trips are the dominant latency on a cache miss.
      compressors: ["zlib"],
    });

    /**
     * `strictQuery` strips unknown keys from filters, so a typo'd or attacker-
     * supplied field can't widen a query. Deliberately NOT enabling Mongoose's
     * `sanitizeFilter`: in Mongoose 9 it wraps rather than preserves nested
     * operators, which breaks `{ _id: { $in: [...] } }`, `{ n: { $gte: 1 } }`
     * and `{ name: { $regex } }` — i.e. all three of this app's core query
     * shapes, including the `countInStock: { $gte: qty }` guard the entire
     * inventory-oversell protection depends on.
     *
     * NoSQL-operator injection is instead blocked at the edge by the
     * `rejectMongoOperators` middleware plus the strict coercion helpers in
     * `utils/input.js`, both of which have end-to-end test coverage.
     */
    mongoose.set("strictQuery", true);

    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected — the driver will reconnect");
    });

    // Surfaced so an operator can see pool pressure without attaching a debugger.
    const pool = conn.connection.getClient?.()?.topology;
    if (pool && typeof pool.on === "function") {
      const eventNames = ["checkoutStarted", "checkedOut", "checkedIn", "waitQueueExceeded"];
      for (const event of eventNames) {
        try {
          pool.on(event, (e) => {
            if (event === "waitQueueExceeded") {
              console.warn(
                "[mongo] pool exhausted — a query waited for a free socket. " +
                  "Raise MONGO_POOL_MAX or reduce per-query cost."
              );
            }
          });
        } catch {
          /* CMAP event names vary between driver versions; not fatal. */
        }
      }
    }

    return conn;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    if (error.message?.includes("ETIMEDOUT")) {
      console.error(
        "\n⚠️  Connection timeout. Usual causes:\n" +
          "   1. The database is down or unreachable\n" +
          "   2. Network / firewall in the way\n" +
          "   3. Atlas IP access list doesn't include this host's egress IP\n" +
          "   4. Wrong connection string in .env"
      );
    }
    process.exit(1);
  }
};

export default connectDB;
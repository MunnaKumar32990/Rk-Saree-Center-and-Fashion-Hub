import mongoose from "mongoose";

/**
 * Boot the local replica set so multi-document transactions are available.
 * MongoDB only supports transactions on a replica set or mongos — a standalone
 * mongod silently rejects them, which is exactly the case the `withTransaction`
 * helper degrades gracefully for.
 */

const URI = "mongodb://127.0.0.1:27018/?directConnection=true";

await mongoose.connect(URI, { serverSelectionTimeoutMS: 8000 });

const admin = mongoose.connection.db.admin();
try {
  const status = await admin.command({ replSetGetStatus: 1 });
  console.log("replica set already up:", status.set);
} catch (err) {
  console.log("initiating:", err.codeName);
  const result = await admin.command({
    replSetInitiate: {
      _id: "rs0",
      members: [{ _id: 0, host: "127.0.0.1:27018" }],
    },
  });
  console.log("initiate result:", result.ok);
}

// Wait for the node to become PRIMARY so writes and transactions work.
for (let i = 0; i < 40; i++) {
  try {
    const hello = await admin.command({ hello: 1 });
    if (hello.isWritablePrimary) {
      console.log("PRIMARY ready after", i, "attempt(s)");
      await mongoose.disconnect();
      process.exit(0);
    }
  } catch {
    /* still electing */
  }
  await new Promise((r) => setTimeout(r, 500));
}

console.error("node never became primary");
await mongoose.disconnect();
process.exit(1);
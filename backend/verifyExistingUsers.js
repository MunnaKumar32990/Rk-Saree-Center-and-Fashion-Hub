/**
 * verifyExistingUsers.js — maintenance script.
 *
 * Marks existing accounts as email-verified so the backfill doesn't log anybody
 * out. Intended to be run ONCE after upgrading from a version where email
 * verification was unenforced.
 *
 * Usage:
 *   node verifyExistingUsers.js --confirm
 *
 * Two bugs in the original version, both fixed here:
 *  1. It used `$set: { token: undefined }`, which Mongoose strips from the
 *     update — so verification tokens and their expiries were left in the
 *     database and remained usable for their full 24 hours.
 *  2. It had no confirmation gate, so a stray invocation silently marked every
 *     unverified account on the system as verified.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./src/config/db.js";
import User from "./src/models/User.js";

dotenv.config();

const confirmed = process.argv.includes("--confirm");

if (!confirmed) {
  console.log(`
This script marks every unverified account as verified.

It exists for one-off use when migrating from a version where email
verification was not enforced. It is NOT a routine operation.

Run it only when you are certain:
  node verifyExistingUsers.js --confirm
`);
  process.exit(0);
}

await connectDB();

const result = await User.updateMany(
  { isEmailVerified: false },
  {
    $set: { isEmailVerified: true },
    // $unset — not $set undefined, which Mongoose discards.
    $unset: {
      emailVerificationToken: "",
      emailVerificationExpires: "",
      pendingEmailToken: "",
      pendingEmailExpires: "",
    },
  }
);

console.log(`\nVerified ${result.modifiedCount} account(s).`);

const remaining = await User.countDocuments({
  $or: [
    { emailVerificationToken: { $exists: true } },
    { passwordResetToken: { $exists: true } },
  ],
});

if (remaining > 0) {
  console.log(`Warning: ${remaining} document(s) still carry a live token.`);
}

await mongoose.connection.close();
process.exit(0);
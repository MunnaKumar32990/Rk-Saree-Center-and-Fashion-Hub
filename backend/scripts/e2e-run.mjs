/**
 * e2e-run.mjs — the harness. Boots the real Express app against a real MongoDB
 * replica set, seeds fixtures, then runs every assertion.
 *
 *   node scripts/e2e-run.mjs
 */

import mongoose from "mongoose";
import { state, rule, login } from "./e2e-context.mjs";

await import("../src/server.js");
await new Promise((r) => setTimeout(r, 3000));

await mongoose.connection.dropDatabase();

const { default: User } = await import("../src/models/User.js");
const { default: Product } = await import("../src/models/Product.js");
const { default: Order } = await import("../src/models/Order.js");
const { default: Coupon } = await import("../src/models/Coupon.js");

// ── Fixtures ─────────────────────────────────────────────────────────────────
await User.create([
  { name: "Owner", email: "owner@test.com", password: "Password123!", isAdmin: true, isEmailVerified: true },
  { name: "Asha", email: "asha@test.com", password: "Password123!", isEmailVerified: true },
  { name: "Victim", email: "victim@test.com", password: "Password123!", isEmailVerified: true },
]);

const saree = await Product.create({
  name: "Katan Banarasi Silk Saree",
  image: "https://res.cloudinary.com/demo/image/upload/a.jpg",
  category: "Women",
  subcategory: "Sarees",
  description: "Handloom pure silk saree with tested zari border.",
  price: 6500,
  countInStock: 3,
  specs: {
    lengthMeters: 6.2, widthInches: 46,
    blousePieceIncluded: true, blousePieceMeters: 0.8,
  },
});

const scarce = await Product.create({
  name: "Single Kanchipuram Silk Saree",
  image: "https://res.cloudinary.com/demo/image/upload/b.jpg",
  category: "Women",
  subcategory: "Sarees",
  description: "One of a kind.",
  price: 8000,
  countInStock: 1,
  specs: { lengthMeters: 6.5 },
});

const discountItem = await Product.create({
  name: "Chanderi Kurti",
  image: "https://res.cloudinary.com/demo/image/upload/c.jpg",
  category: "Women",
  subcategory: "Kurtis",
  description: "Lightweight chanderi kurti.",
  price: 2000,
  discount: 25,
  countInStock: 10,
});

await Coupon.create({
  code: "SAVE500",
  description: "500 off orders over 3000",
  discountType: "fixed",
  discountValue: 500,
  minOrderAmount: 3000,
  maxUses: 1,
  expiresAt: new Date(Date.now() + 7 * 86400000),
});

const cusToken = await login("asha@test.com");
const admToken = await login("owner@test.com");
const vicToken = await login("victim@test.com");

const ctx = {
  User, Product, Order, Coupon, mongoose,
  saree, scarce, discountItem,
  cusToken, admToken, vicToken,
};

console.log(`\n${"=".repeat(74)}`);
console.log("RK Saree Center -- END-TO-END VERIFICATION");
console.log(`DB: ${mongoose.connection.name} (replicaSet=${mongoose.connection.client?.s?.options?.replicaSet ?? "n/a"})`);
console.log(`${"=".repeat(74)}`);

const { run: run1 } = await import("./e2e-body-1.mjs");
const { run: run2 } = await import("./e2e-body-2.mjs");
const { run: run3 } = await import("./e2e-body-3.mjs");
const { run: run4 } = await import("./e2e-body-4.mjs");
const { run: run5 } = await import("./e2e-body-5.mjs");
const { run: run6 } = await import("./e2e-body-6.mjs");
const { run: run7 } = await import("./e2e-body-7.mjs");
const { run: run8 } = await import("./e2e-body-8.mjs");
const { run: run9 } = await import("./e2e-body-9.mjs");

await run1(ctx);
await run2(ctx);
await run3(ctx);
await run4(ctx);
await run5(ctx);
await run6(ctx);
await run7(ctx);
await run8(ctx);
await run9(ctx);

console.log(`\n${"=".repeat(74)}`);
console.log(`RESULT:  ${state.passed} passed,  ${state.failed} failed`);
if (state.failures.length) {
  console.log("\nFailures:");
  state.failures.forEach((f) => console.log(`  - ${f}`));
}
console.log("=".repeat(74));

await mongoose.connection.dropDatabase();
await mongoose.connection.close();
process.exit(state.failed === 0 ? 0 : 1);

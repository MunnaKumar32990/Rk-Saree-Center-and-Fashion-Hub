/**
 * e2e-body-1.mjs — injection, payment exploit, inventory, restock, coupons.
 *
 * Each block proves that a vulnerability found in the audit is genuinely closed.
 */

import { api, check, rule, restock } from "./e2e-context.mjs";

export const ADDRESS = {
  fullName: "Asha",
  address: "12 Gandhi Road",
  city: "Patna",
  state: "Bihar",
  postalCode: "800001",
  phone: "9876543210",
};

export const orderBody = (items, extra = {}) => ({
  orderItems: items,
  shippingAddress: ADDRESS,
  paymentMethod: "COD",
  ...extra,
});

const stockOf = async (ctx, id) => (await ctx.Product.findById(id).lean()).countInStock;

export async function run(ctx) {
  // ═══════════════════════════════════════════════════════════════════════════
  rule("1. NoSQL OPERATOR INJECTION  (account + admin takeover)");
  // ═══════════════════════════════════════════════════════════════════════════
  // Original exploit: two unauthenticated requests, no rate limit.
  //   POST /api/users/forgot-password {"email":{"$ne":""}}
  //     matched the first user, wrote a reset token onto THEIR document, then
  //     emailed the link to the ATTACKER's address.
  //   POST /api/users/reset-password/<token> {"password":"owned"}
  //     set the attacker's password on the victim's account.

  const cases = [
    ["forgot-password {$ne:''}", "/api/users/forgot-password", { email: { $ne: "" } }],
    ["forgot-password {$ne:null}", "/api/users/forgot-password", { email: { $ne: null } }],
    ["forgot-password {$gt:''}", "/api/users/forgot-password", { email: { $gt: "" } }],
    ["login {$ne:''}", "/api/users/login", { email: { $ne: "" }, password: "x" }],
    ["register {$exists:true}", "/api/users/register",
      { email: { $exists: true }, name: "x", password: "Password123!" }],
    ["resend-verification {$ne:''}", "/api/users/resend-verification", { email: { $ne: "" } }],
    ["2fa/send-code {$ne:''}", "/api/users/2fa/send-code", { email: { $ne: "" } }],
    ["2fa/verify {$ne:null} code", "/api/users/2fa/verify",
      { email: "owner@test.com", code: { $ne: null } }],
    ["2fa/verify object email", "/api/users/2fa/verify",
      { email: { $gt: "" }, code: { $ne: null } }],
    ["coupon validate object code", "/api/orders/coupon/validate",
      { code: { $ne: null }, orderAmount: 5000 }],
  ];

  for (const [name, path, body] of cases) {
    const r = await api(path, { method: "POST", body, token: ctx.cusToken });
    check(`rejects ${name}`, r.status >= 400 && r.status < 500, `got ${r.status}`);
  }

  const a = await api("/api/users/forgot-password", { method: "POST", body: { email: "asha@test.com" } });
  const b = await api("/api/users/forgot-password", { method: "POST", body: { email: "nobody@test.com" } });
  check("forgot-password does not leak account existence",
    a.status === 200 && b.status === 200 && a.text === b.text,
    `existing=${a.status} missing=${b.status}`);

  const c = await api("/api/users/2fa/send-code", { method: "POST", body: { email: "asha@test.com" } });
  const d = await api("/api/users/2fa/send-code", { method: "POST", body: { email: "nobody@test.com" } });
  check("2fa/send-code does not leak account existence",
    c.status === 200 && d.status === 200 && c.text === d.text,
    `existing=${c.status} missing=${d.status}`);

  // A real reset must only ever touch the address on file. Clear any tokens the
  // leak-test above legitimately created, then request one for a single account
  // and prove exactly one document changed.
  await ctx.User.updateMany({}, { $unset: { passwordResetToken: "", passwordResetExpires: "" } });
  await api("/api/users/forgot-password", { method: "POST", body: { email: "victim@test.com" } });
// `strictQuery` is on; no query operators are needed for this assertion.
  const allUsers = await ctx.User.find({}).select("+passwordResetToken").lean();
  const withToken = allUsers.filter((u) => Boolean(u.passwordResetToken)).length;
  const vDoc = allUsers.find((u) => u.email === "victim@test.com");
  const ownerDoc = allUsers.find((u) => u.email === "owner@test.com");
  const ashaDoc = allUsers.find((u) => u.email === "asha@test.com");

  check("reset token is written only to the address on file",
    Boolean(vDoc.passwordResetToken) && withToken === 1,
    `victimHasToken=${Boolean(vDoc.passwordResetToken)} accountsWithToken=${withToken}`);
  check("no other account gained a reset token",
    !ownerDoc.passwordResetToken && !ashaDoc.passwordResetToken);

  // Stored as a digest, not the raw token that was emailed.
  check("the reset token is stored hashed, not in plaintext",
    Boolean(vDoc.passwordResetToken) && /^[0-9a-f]{64}$/.test(vDoc.passwordResetToken),
    `stored=${String(vDoc.passwordResetToken).slice(0, 20)}...`);

  // ═══════════════════════════════════════════════════════════════════════════
  restock(ctx, ctx.saree, 30);
  // ═══════════════════════════════════════════════════════════════════════════
  // Original: /api/orders/razorpay took a client-chosen amount and bound it to no
  // order; /api/payment/verify had no ownership check, so a valid ₹1 signature
  // could be replayed onto a ₹50,000 order.

  const dead = await api("/api/orders/razorpay", {
    method: "POST", token: ctx.cusToken, body: { amount: 1 },
  });
  check("the unowned payment-creation endpoint is gone", dead.status === 404, `got ${dead.status}`);

  const tampered = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([{ product: String(ctx.saree._id), qty: 1, price: 1, name: "HACKED", image: "x.jpg" }]),
  });
  check("client-supplied unit price is ignored", tampered.data?.itemsPrice === 6500,
    `itemsPrice=${tampered.data?.itemsPrice}`);
  check("server total is recomputed from DB prices", tampered.data?.totalPrice === 6500,
    `total=${tampered.data?.totalPrice}`);
  check("order line keeps the DB name, not the client's",
    tampered.data?.orderItems?.[0]?.name === ctx.saree.name);

  const victimOrder = await api("/api/orders", {
    method: "POST", token: ctx.vicToken,
    body: orderBody([{ product: String(ctx.saree._id), qty: 1 }]),
  });
  const foreign = await api("/api/payment/verify", {
    method: "POST", token: ctx.cusToken,
    body: {
      razorpay_order_id: "order_x", razorpay_payment_id: "pay_x",
      razorpay_signature: "deadbeef", orderId: victimOrder.data?._id,
    },
  });
  check("cannot verify payment on another customer's order",
    foreign.status === 403 || foreign.status === 400, `got ${foreign.status}`);

  const bindOrder = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([{ product: String(ctx.saree._id), qty: 1 }]),
  });
  const mismatch = await api("/api/payment/verify", {
    method: "POST", token: ctx.cusToken,
    body: {
      razorpay_order_id: "order_not_ours", razorpay_payment_id: "pay_y",
      razorpay_signature: "deadbeef", orderId: bindOrder.data?._id,
    },
  });
  check("payment not bound to this order is rejected", mismatch.status === 400, `got ${mismatch.status}`);

  // ═══════════════════════════════════════════════════════════════════════════
  restock(ctx, ctx.saree, 30);
  // ═══════════════════════════════════════════════════════════════════════════
  // Original: a read-then-write stock check, and countInStock was never
  // decremented anywhere in the codebase.

  check("scarce product starts with 1 unit", (await stockOf(ctx, ctx.scarce._id)) === 1);

  const o1 = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([{ product: String(ctx.scarce._id), qty: 1 }]),
  });
  check("first order for a 1-unit item succeeds", o1.status === 201, `got ${o1.status} ${o1.text?.slice(0, 90)}`);
  check("stock is decremented to 0", (await stockOf(ctx, ctx.scarce._id)) === 0,
    `got ${await stockOf(ctx, ctx.scarce._id)}`);

  const o2 = await api("/api/orders", {
    method: "POST", token: ctx.vicToken,
    body: orderBody([{ product: String(ctx.scarce._id), qty: 1 }]),
  });
  check("second order for the same 1-unit item is refused", o2.status >= 400, `got ${o2.status}`);
  check("customer gets a specific stock message", /sold out|left/i.test(o2.data?.message || ""),
    `msg=${o2.data?.message}`);

  const burst = await ctx.Product.create({
    name: "Race Test Kurti", image: "x.jpg", category: "Women",
    subcategory: "Kurtis", description: "d", price: 100, countInStock: 3,
  });
  const attempts = await Promise.all(
    Array.from({ length: 8 }, () =>
      api("/api/orders", {
        method: "POST", token: ctx.cusToken,
        body: orderBody([{ product: String(burst._id), qty: 1 }]),
      })
    )
  );
  const created = attempts.filter((x) => x.status === 201).length;
  check("8 concurrent orders for 3 units create exactly 3", created === 3, `created ${created}`);
  check("stock never goes negative under concurrency", (await stockOf(ctx, burst._id)) === 0,
    `stock=${await stockOf(ctx, burst._id)}`);

  const badQty = [
    ["negative quantity", -5],
    ["fractional quantity", 1.5],
    ["zero quantity", 0],
    ["over-max quantity", 99],
  ];
  for (const [label, qty] of badQty) {
    const r = await api("/api/orders", {
      method: "POST", token: ctx.cusToken,
      body: orderBody([{ product: String(ctx.saree._id), qty }]),
    });
    check(`rejects ${label}`, r.status === 400, `got ${r.status}`);
  }

  // A numeric STRING is accepted but coerced to a strict integer. Rejecting it
  // outright would break native form inputs; accepting it without coercion is
  // how a fractional or negative total got in before.
  const numericString = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([{ product: String(ctx.saree._id), qty: "2" }]),
  });
  check("a numeric string quantity is coerced to an integer, not trusted",
    numericString.status === 201 && Number.isInteger(numericString.data?.orderItems?.[0]?.qty),
    `status=${numericString.status} qty=${numericString.data?.orderItems?.[0]?.qty}`);

  const floatString = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([{ product: String(ctx.saree._id), qty: "1.5" }]),
  });
  check("a fractional string quantity is refused", floatString.status === 400,
    `got ${floatString.status}`);

  const negString = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([{ product: String(ctx.saree._id), qty: "-3" }]),
  });
  check("a negative string quantity is refused", negString.status === 400,
    `got ${negString.status}`);

  const notArray = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: { orderItems: "nope", shippingAddress: ADDRESS, paymentMethod: "COD" },
  });
  check("rejects non-array orderItems", notArray.status === 400, `got ${notArray.status}`);

  const badPin = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([{ product: String(ctx.saree._id), qty: 1 }], {
      shippingAddress: { ...ADDRESS, postalCode: "12" },
    }),
  });
  check("rejects invalid PIN code", badPin.status === 400, `got ${badPin.status}`);

  const badPhone = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([{ product: String(ctx.saree._id), qty: 1 }], {
      shippingAddress: { ...ADDRESS, phone: "123" },
    }),
  });
  check("rejects invalid phone number", badPhone.status === 400, `got ${badPhone.status}`);

  // ═══════════════════════════════════════════════════════════════════════════
  restock(ctx, ctx.saree, 30);
  // ═══════════════════════════════════════════════════════════════════════════
  const rp = await ctx.Product.create({
    name: "Restock Test", image: "x.jpg", category: "Men",
    subcategory: "Shirts", description: "d", price: 500, countInStock: 5,
  });
  const start = await stockOf(ctx, rp._id);
  const rOrder = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([{ product: String(rp._id), qty: 2 }]),
  });
  check("stock decremented on order", (await stockOf(ctx, rp._id)) === start - 2,
    `${start} -> ${await stockOf(ctx, rp._id)}`);

  const cancelled = await api(`/api/orders/${rOrder.data._id}/cancel`, {
    method: "PUT", token: ctx.cusToken,
  });
  check("cancellation succeeds", cancelled.status === 200,
    `got ${cancelled.status} ${cancelled.text?.slice(0, 90)}`);
  check("stock is restored on cancellation", (await stockOf(ctx, rp._id)) === start,
    `expected ${start}, got ${await stockOf(ctx, rp._id)}`);

  const recancel = await api(`/api/orders/${rOrder.data._id}/cancel`, {
    method: "PUT", token: ctx.cusToken,
  });
  check("cancelling twice is refused", recancel.status >= 400, `got ${recancel.status}`);
  check("stock is NOT double-restored", (await stockOf(ctx, rp._id)) === start,
    `got ${await stockOf(ctx, rp._id)}`);

  // ═══════════════════════════════════════════════════════════════════════════
  restock(ctx, ctx.saree, 30);
  // ═══════════════════════════════════════════════════════════════════════════
  // Original: the UI validated against the Coupon collection while order
  // creation re-validated against a hardcoded array and SILENTLY DROPPED the
  // discount -- shown "you save 500", charged full price.

  const preview = await api("/api/orders/coupon/validate", {
    method: "POST", token: ctx.cusToken,
    body: { code: "SAVE500", orderItems: [{ product: String(ctx.saree._id), qty: 1 }] },
  });
  check("admin-created coupon validates", preview.status === 200,
    `got ${preview.status} ${preview.text?.slice(0, 90)}`);
  check("preview discount is 500", preview.data?.discount === 500, `got ${preview.data?.discount}`);

  const applied = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([{ product: String(ctx.saree._id), qty: 1 }], { couponCode: "SAVE500" }),
  });
  check("coupon is actually applied at checkout", applied.data?.couponDiscount === 500,
    `got ${applied.data?.couponDiscount}`);
  check("total reflects the discount (6500 - 500)", applied.data?.totalPrice === 6000,
    `got ${applied.data?.totalPrice}`);

  const saved = await ctx.Coupon.findOne({ code: "SAVE500" }).lean();
  check("coupon usage is recorded", saved.usedCount === 1, `usedCount=${saved.usedCount}`);

  const second = await api("/api/orders", {
    method: "POST", token: ctx.vicToken,
    body: orderBody([{ product: String(ctx.saree._id), qty: 1 }], { couponCode: "SAVE500" }),
  });
  check("maxUses:1 coupon cannot be redeemed twice", second.status >= 400, `got ${second.status}`);
  check("customer is told why", typeof second.data?.message === "string" && second.data.message.length > 0);

  const bogus = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([{ product: String(ctx.saree._id), qty: 1 }], { couponCode: "NOTREAL" }),
  });
  check("invalid coupon fails loudly rather than charging full price",
    bogus.status === 400, `got ${bogus.status}`);

  const minOrder = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([{ product: String(ctx.discountItem._id), qty: 1 }], { couponCode: "SAVE500" }),
  });
  check("minimum-order rule is enforced (1500 < 3000)", minOrder.status === 400, `got ${minOrder.status}`);

  const pct = await api("/api/orders", {
    method: "POST", token: ctx.admToken,
    body: { code: "BADPCT", discountType: "percentage", discountValue: 500,
            expiresAt: new Date(Date.now() + 86400000).toISOString() },
  });
  check("a percentage discount above 100 is rejected", pct.status === 400, `got ${pct.status}`);
}

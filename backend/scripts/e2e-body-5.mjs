/**
 * e2e-body-5.mjs — webhook authentication, token hashing at rest, and the
 * logging/CORS behaviours the security review flagged.
 */

import crypto from "crypto";
import { api, check, rule, login } from "./e2e-context.mjs";
import { orderBody } from "./e2e-body-1.mjs";

export async function run(ctx) {
  // ═══════════════════════════════════════════════════════════════════════════
  rule("20. WEBHOOK AUTHENTICATION  (the unsigned-payment hole)");
  // ═══════════════════════════════════════════════════════════════════════════
  // The Razorpay handler originally performed NO signature verification, so
  // anyone who guessed a razorpayOrderId could POST a forged `payment.captured`
  // event and have an unpaid order marked paid — goods dispatched for nothing.

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  // Section 19 suspends a customer account, so use a fresh, unsuspended session.
  const hook = await login("owner@test.com");
  const razorpayOrderId = "order_TESTWEBHOOK001";

  const order = await api("/api/orders", {
    method: "POST", token: hook,
    body: orderBody([{ product: String(ctx.saree._id), qty: 1 }]),
  });
  check("order created for the webhook test", order.status === 201, `got ${order.status}`);

  // Pretend the gateway issued an order for this DB order, as createPaymentOrder does.
  await ctx.Order.updateOne(
    { _id: order.data._id },
    { $set: { "paymentResult.razorpayOrderId": razorpayOrderId } }
  );

  const forged = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_FORGED",
          order_id: razorpayOrderId,
          amount: Math.round(order.data.totalPrice * 100),
          status: "captured",
          method: "upi",
        },
      },
    },
  };
  const rawBody = JSON.stringify(forged);
  const sign = (body) =>
    crypto.createHmac("sha256", secret).update(body).digest("hex");

  const post = async (body, signature, path = "/api/webhooks/razorpay") => {
    const res = await fetch(`http://127.0.0.1:5099${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(signature !== undefined ? { "x-razorpay-signature": signature } : {}),
      },
      body,
    });
    return { status: res.status, text: await res.text() };
  };

  // No signature at all.
  await post(rawBody, undefined);
  let after = await ctx.Order.findById(order.data._id).lean();
  check("an UNSIGNED webhook does not mark the order paid", after.isPaid === false,
    `isPaid=${after.isPaid}`);

  // Wrong signature.
  await post(rawBody, "deadbeef");
  after = await ctx.Order.findById(order.data._id).lean();
  check("a webhook with a WRONG signature does not mark the order paid",
    after.isPaid === false, `isPaid=${after.isPaid}`);

  // Signature over a DIFFERENT body (tamper attempt).
  const tampered = JSON.stringify({ ...forged, event: "payment.authorized_tampered" });
  await post(tampered, sign(rawBody));
  after = await ctx.Order.findById(order.data._id).lean();
  check("a signature that doesn't match the body is rejected", after.isPaid === false,
    `isPaid=${after.isPaid}`);

  // Correctly signed, and only then is the order marked paid.
  const signedPost = await post(rawBody, sign(rawBody));
  check("a correctly signed webhook returns 200", signedPost.status === 200, `got ${signedPost.status}`);
  // Processing is fire-and-forget after the 200.
  await new Promise((r) => setTimeout(r, 400));
  after = await ctx.Order.findById(order.data._id).lean();
  check("a correctly signed webhook DOES mark the order paid", after.isPaid === true,
    `isPaid=${after.isPaid}`);
  check("the payment id from the event is recorded",
    after.paymentResult?.razorpayPaymentId === "pay_FORGED",
    `got ${after.paymentResult?.razorpayPaymentId}`);

  const auditCount = await ctx.mongoose.connection.db
    .collection("auditlogs")
    .countDocuments({ action: "payment.webhook_signature_rejected", severity: "critical" });
  check("rejected webhooks are audited as critical", auditCount >= 3, `got ${auditCount}`);

  // Amount mismatch on a VALID signature is still refused.
  const otherOrder = await api("/api/orders", {
    method: "POST", token: hook,
    body: orderBody([{ product: String(ctx.saree._id), qty: 1 }]),
  });
  const otherGw = "order_TESTWEBHOOK002";
  await ctx.Order.updateOne(
    { _id: otherOrder.data._id },
    { $set: { "paymentResult.razorpayOrderId": otherGw } }
  );
  const wrongAmount = JSON.stringify({
    ...forged,
    payload: {
      payment: {
        entity: {
          id: "pay_LOWVALUE",
          order_id: otherGw,
          amount: 100, // ₹1 instead of the real total
          status: "captured",
          method: "upi",
        },
      },
    },
  });
  await post(wrongAmount, sign(wrongAmount));
  await new Promise((r) => setTimeout(r, 400));
  const otherAfter = await ctx.Order.findById(otherOrder.data._id).lean();
  check("a signed webhook with the wrong amount is refused",
    otherAfter.isPaid === false, `isPaid=${otherAfter.isPaid}`);

  // ── WhatsApp: fails closed when the app secret is absent ──────────────────
  const waNoSecret = await fetch("http://127.0.0.1:5099/api/webhooks/whatsapp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entry: [{
        changes: [{ value: { messages: [{ from: "919999999999", text: { body: "CANCEL" } }] } }],
      }],
    }),
  });
  check("the WhatsApp webhook still answers 200 (Meta must not retry)",
    waNoSecret.status === 200, `got ${waNoSecret.status}`);

  // `recordAudit` for an unverified message is fire-and-forget after the 200
  // (Meta must never see a failure and retry), so allow it to land.
  await new Promise((r) => setTimeout(r, 400));
  const waRejectAudit = await ctx.mongoose.connection.db
    .collection("auditlogs")
    .countDocuments({ action: "webhook.whatsapp_secret_missing", severity: "critical" });
  check("an unverified WhatsApp message is rejected and audited",
    waRejectAudit >= 1, `got ${waRejectAudit}`);

  // ═══════════════════════════════════════════════════════════════════════════
  rule("21. TOKEN HYGIENE");
  // ═══════════════════════════════════════════════════════════════════════════
  const users = await ctx.User.find({}).select("+passwordResetToken +emailVerificationToken").lean();

  const withReset = users.filter((u) => u.passwordResetToken);
  check("no reset token is stored in plaintext",
    withReset.length === 0 || withReset.every((u) => /^[0-9a-f]{64}$/.test(u.passwordResetToken)),
    withReset.map((u) => String(u.passwordResetToken).slice(0, 16)).join(","));

  const withVerify = users.filter((u) => u.emailVerificationToken);
  check("no email-verification token is stored in plaintext",
    withVerify.length === 0 || withVerify.every((u) => /^[0-9a-f]{64}$/.test(u.emailVerificationToken)),
    withVerify.map((u) => String(u.emailVerificationToken).slice(0, 16)).join(","));

  // A wrong raw token must not match a stored digest.
  const token = crypto.randomBytes(32).toString("hex");
  const resetRes = await api(`/api/users/reset-password/${token}`, {
    method: "POST", body: { password: "AttackerPassword123!" },
  });
  check("a random reset token is rejected", resetRes.status === 400, `got ${resetRes.status}`);

  const verifyRes = await api(`/api/users/verify-email/${token}`);
  check("a random verification token is rejected", verifyRes.status === 400,
    `got ${verifyRes.status}`);

  // Confirm the victim's stored hash is untouched, rather than trying to log in:
  // section 19 deliberately suspended that account, so a login would 401 for
  // reasons unrelated to the reset attempt.
  // Not `.lean()` — `matchPassword()` is a document method that a plain object
  // from a lean read would not carry.
  const victim = await ctx.User.findOne({ email: "victim@test.com" }).select("+password");
  check("the account is untouched after the failed reset attempt",
    Boolean(await victim.matchPassword("Password123!")),
    "password hash changed or unreadable");

  // ═══════════════════════════════════════════════════════════════════════════
  rule("22. CORS BEHAVIOUR  (must not 500 or leak a stack)");
  // ═══════════════════════════════════════════════════════════════════════════
  const evil = await fetch("http://127.0.0.1:5099/api/products?limit=1", {
    headers: { Origin: "https://evil.example.com" },
  });
  check("a disallowed Origin gets no CORS allow header",
    !evil.headers.get("access-control-allow-origin"), "ACAO was present");
  check("a disallowed Origin does not produce a 500",
    evil.status !== 500, `got ${evil.status}`);

  const allowedOrigin = await fetch("http://127.0.0.1:5099/api/products?limit=1", {
    headers: { Origin: "http://localhost:5173" },
  });
  check("an allowed Origin receives the CORS allow header",
    allowedOrigin.headers.get("access-control-allow-origin") === "http://localhost:5173",
    `got ${allowedOrigin.headers.get("access-control-allow-origin")}`);

  // ═══════════════════════════════════════════════════════════════════════════
  rule("23. FACETS  (was an unbounded, un-rate-limited DoS primitive)");
  // ═══════════════════════════════════════════════════════════════════════════
  const f1 = await api("/api/products/facets");
  check("facets responds", f1.status === 200, `got ${f1.status}`);
  check("facets are cacheable at the HTTP layer",
    (f1.headers?.get?.("cache-control") || "").includes("max-age"),
    f1.headers?.get?.("cache-control"));
  check("facets include a price range",
    typeof f1.data?.priceRange?.max === "number");
  check("facets include subcategories", (f1.data?.subcategories || []).length > 0);

  const f2 = await api("/api/products/facets");
  check("a repeat facets request succeeds (cache path)", f2.status === 200);

  // Deep pagination must be refused rather than scanning the collection.
  const deep = await api("/api/products?page=9999&limit=60");
  check("a deep page number does not blow up", deep.status === 200, `got ${deep.status}`);
  check("a deep page returns no products (capped at 50 pages)",
    (deep.data?.products || []).length === 0, `got ${deep.data?.products?.length}`);

  // ═══════════════════════════════════════════════════════════════════════════
  rule("24. DERIVED FIELDS  (virtuals must reach the client)");
  // ═══════════════════════════════════════════════════════════════════════════
  const single = await api(`/api/products/${ctx.saree._id}`);
  check("the PDP exposes discountedPrice",
    typeof single.data?.discountedPrice === "number", `got ${single.data?.discountedPrice}`);
  check("the PDP exposes inStock", typeof single.data?.inStock === "boolean");
  check("the PDP exposes stockLabel", typeof single.data?.stockLabel === "string",
    `got ${single.data?.stockLabel}`);
  check("the PDP still exposes _id (the whole frontend addresses by it)",
    Boolean(single.data?._id));

  const listing = await api("/api/products?limit=5");
  check("listings also expose the derived price fields",
    (listing.data?.products || []).every(
      (p) => typeof p.discountedPrice === "number" && typeof p.inStock === "boolean"
    ));
  check("listings still expose _id",
    (listing.data?.products || []).every((p) => Boolean(p._id)));
}

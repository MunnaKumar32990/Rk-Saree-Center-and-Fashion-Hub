/**
 * e2e-body-2.mjs — pricing, IDOR, status machine, returns, sessions.
 */

import { api, check, rule, restock } from "./e2e-context.mjs";
import { ADDRESS, orderBody } from "./e2e-body-1.mjs";

export async function run(ctx) {
  // ═══════════════════════════════════════════════════════════════════════════
  rule("6. PRICING  (discounted price + shipping tiers)");
  // ═══════════════════════════════════════════════════════════════════════════
  // discountItem: price 2000, 25% off -> unit 1500. Subtotal 1500 is below the
  // 2000 free-shipping threshold -> shipping 99, total 1599.

  const disc = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([{ product: String(ctx.discountItem._id), qty: 1 }]),
  });
  check("discounted unit price applied (2000 - 25% = 1500)",
    disc.data?.itemsPrice === 1500, `got ${disc.data?.itemsPrice}`);
  check("shipping charged below the free threshold (99)",
    disc.data?.shippingPrice === 99, `got ${disc.data?.shippingPrice}`);
  check("total is 1599", disc.data?.totalPrice === 1599, `got ${disc.data?.totalPrice}`);
  check("a delivery window is committed on the order",
    typeof disc.data?.estimatedDelivery === "string" && disc.data.estimatedDelivery.length > 0,
    `got ${disc.data?.estimatedDelivery}`);
check("sales slip exposes the derived price and availability fields",

    (await api(`/api/products/${ctx.scarce._id}`)).data?.inStock === false &&

    typeof (await api(`/api/products/${ctx.saree._id}`)).data?.discountedPrice === "number");

  const freeShip = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([{ product: String(ctx.discountItem._id), qty: 2 }]),
  });
  check("free shipping at the 2000 threshold", freeShip.data?.shippingPrice === 0,
    `got ${freeShip.data?.shippingPrice}`);

  const express = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([{ product: String(ctx.discountItem._id), qty: 1 }], { shippingMethod: "express" }),
  });
  check("express shipping is charged (199)", express.data?.shippingPrice === 199,
    `got ${express.data?.shippingPrice}`);
  check("express method is recorded on the order", express.data?.shippingMethod === "express");

  const quote = await api("/api/orders/quote", {
    method: "POST", body: { subtotal: 6500, postalCode: "800001" },
  });
  check("public shipping quote returns both tiers", quote.data?.options?.length === 2,
    `got ${quote.data?.options?.length}`);
  check("quote reports COD eligibility", typeof quote.data?.cod?.eligible === "boolean");

  // ═══════════════════════════════════════════════════════════════════════════
  rule("7. IDOR  (cross-customer data access)");
  // ═══════════════════════════════════════════════════════════════════════════
  const privateOrder = await api("/api/orders", {
    method: "POST", token: ctx.vicToken,
    body: orderBody([{ product: String(ctx.saree._id), qty: 1 }]),
  });
  const pid = privateOrder.data._id;

  check("cannot read another customer's order",
    (await api(`/api/orders/${pid}`, { token: ctx.cusToken })).status === 403);
  check("admin CAN read any order",
    (await api(`/api/orders/${pid}`, { token: ctx.admToken })).status === 200);
  check("cannot read another customer's return request",
    (await api(`/api/orders/${pid}/return`, { token: ctx.cusToken })).status === 403);
  check("cannot cancel another customer's order",
    (await api(`/api/orders/${pid}/cancel`, { method: "PUT", token: ctx.cusToken })).status === 403);
  check("non-admin cannot list users",
    (await api("/api/users", { token: ctx.cusToken })).status === 403);
  check("non-admin cannot read order stats",
    (await api("/api/orders/stats", { token: ctx.cusToken })).status === 403);
  check("non-admin cannot create products",
    (await api("/api/products", { method: "POST", token: ctx.cusToken, body: { name: "x" } })).status === 403);
  check("non-admin cannot create coupons",
    (await api("/api/coupons", { method: "POST", token: ctx.cusToken, body: { code: "X1" } })).status === 403);

  // Admin must not demote themselves, and must not demote the last admin.
  const list = (await api("/api/users?limit=50", { token: ctx.admToken })).data.users;
  const adminRow = list.find((u) => u.isAdmin);
  const selfDemote = await api(`/api/users/${adminRow._id}/role`, {
    method: "PUT", token: ctx.admToken, body: { isAdmin: false },
  });
  check("admin cannot demote themselves", selfDemote.status === 400, `got ${selfDemote.status}`);
  check("the reason explains why", /admin/i.test(selfDemote.data?.message || ""),
    `msg=${selfDemote.data?.message}`);

  const lastAdmin = await api(`/api/users/${adminRow._id}/status`, {
    method: "PUT", token: ctx.admToken, body: { status: "Suspended" },
  });
  check("admin status cannot be changed from the users screen", lastAdmin.status === 400,
    `got ${lastAdmin.status}`);

  // ═══════════════════════════════════════════════════════════════════════════
  restock(ctx, ctx.saree, 20);

  rule("8. ORDER STATE MACHINE");
  // ═══════════════════════════════════════════════════════════════════════════
  // Original: VALID_TRANSITIONS existed but only one of five mutation paths
  // consulted it, and a `validNext.length > 0 &&` short-circuit meant terminal
  // statuses accepted ANY transition -- a Cancelled order could be resurrected.

  const lifecycle = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([{ product: String(ctx.saree._id), qty: 1 }]),
  });
  const lid = lifecycle.data._id;
  check("COD order starts as Confirmed", lifecycle.data?.status === "Confirmed",
    `got ${lifecycle.data?.status}`);

  const skip = await api(`/api/orders/${lid}/status`, {
    method: "PUT", token: ctx.admToken, body: { status: "Delivered" },
  });
  check("cannot skip Confirmed -> Delivered", skip.status === 400, `got ${skip.status}`);
  check("the reason names the illegal transition", /Cannot change order status/i.test(skip.data?.message || ""),
    `msg=${skip.data?.message}`);

  const packed = await api(`/api/orders/${lid}/status`, {
    method: "PUT", token: ctx.admToken, body: { status: "Packed" },
  });
  check("Confirmed -> Packed is allowed", packed.status === 200, `got ${packed.status}`);

  const shipped = await api(`/api/orders/${lid}/status`, {
    method: "PUT", token: ctx.admToken,
    body: { status: "Shipped", trackingNumber: "AWB123", courierName: "Delhivery" },
  });
  check("Packed -> Shipped is allowed", shipped.status === 200, `got ${shipped.status}`);
  check("tracking number is stored", shipped.data?.trackingNumber === "AWB123");

  const cancelShipped = await api(`/api/orders/${lid}/cancel`, {
    method: "PUT", token: ctx.cusToken,
  });
  check("a shipped order cannot be cancelled by the customer",
    cancelShipped.status === 400, `got ${cancelShipped.status}`);

  const ofd = await api(`/api/orders/${lid}/status`, { method: "PUT", token: ctx.admToken, body: { status: "Out for Delivery" } });
  check("Shipped -> Out for Delivery is allowed", ofd.status === 200, `got ${ofd.status}`);

  const delivered = await api(`/api/orders/${lid}/deliver`, { method: "PUT", token: ctx.admToken });
  check("Out for Delivery -> Delivered is allowed", delivered.status === 200, `got ${delivered.status}`);
  check("COD settles on delivery (isPaid true)", delivered.data?.isPaid === true);
  check("delivery timestamp is set", Boolean(delivered.data?.deliveredAt));

  const resurrect = await api(`/api/orders/${lid}/status`, {
    method: "PUT", token: ctx.admToken, body: { status: "Cancelled" },
  });
  check("Delivered -> Cancelled is refused", resurrect.status === 400, `got ${resurrect.status}`);

  const cancelThenDeliver = await api(`/api/orders/${lifecycle.data._id}/cancel`, {
    method: "PUT", token: ctx.cusToken,
  });
  check("cancel after delivery is refused", cancelThenDeliver.status >= 400,
    `got ${cancelThenDeliver.status}`);

  // Terminal-status resurrection via bulk update.
  const cancelledOrder = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([{ product: String(ctx.saree._id), qty: 1 }]),
  });
  await api(`/api/orders/${cancelledOrder.data._id}/cancel`, { method: "PUT", token: ctx.cusToken });
  const bulkResurrect = await api("/api/orders/bulk-status", {
    method: "PUT", token: ctx.admToken,
    body: { orderIds: [cancelledOrder.data._id], status: "Delivered" },
  });
  check("bulk update refuses to resurrect a cancelled order",
    (bulkResurrect.data?.updated ?? 0) === 0 && (bulkResurrect.data?.skipped?.length ?? 0) === 1,
    JSON.stringify(bulkResurrect.data));

  // ═══════════════════════════════════════════════════════════════════════════
  restock(ctx, ctx.saree, 20);

  rule("9. RETURNS  (window, partial, restock)");
  // ═══════════════════════════════════════════════════════════════════════════

  const earlyReturn = await api(`/api/orders/${cancelledOrder.data._id}/return`, {
    method: "POST", token: ctx.cusToken,
    body: { reason: "Changed mind" },
  });
  check("cannot raise a return on a non-delivered order", earlyReturn.status === 400,
    `got ${earlyReturn.status}`);

  const multi = await api("/api/orders", {
    method: "POST", token: ctx.cusToken,
    body: orderBody([
      { product: String(ctx.saree._id), qty: 1 },
      { product: String(ctx.discountItem._id), qty: 2 },
    ]),
  });
  await api(`/api/orders/${multi.data._id}/status`, { method: "PUT", token: ctx.admToken, body: { status: "Packed" } });
  await api(`/api/orders/${multi.data._id}/status`, { method: "PUT", token: ctx.admToken, body: { status: "Shipped" } });
  await api(`/api/orders/${multi.data._id}/status`, { method: "PUT", token: ctx.admToken, body: { status: "Out for Delivery" } });
  await api(`/api/orders/${multi.data._id}/deliver`, { method: "PUT", token: ctx.admToken });

  const stockBefore = (await ctx.Product.findById(ctx.saree._id).lean()).countInStock;
  const returnRes = await api(`/api/orders/${multi.data._id}/return`, {
    method: "POST", token: ctx.cusToken,
    body: {
      reason: "Colour different from photo",
      items: [{ product: String(ctx.saree._id), qty: 1 }],
    },
  });
  check("partial return is accepted", returnRes.status === 201,
    `got ${returnRes.status} ${returnRes.text?.slice(0, 90)}`);
  check("only the selected line is queued for return",
    returnRes.data?.items?.length === 1 && String(returnRes.data.items[0].product) === String(ctx.saree._id));

  const dup = await api(`/api/orders/${multi.data._id}/return`, {
    method: "POST", token: ctx.cusToken, body: { reason: "Changed mind" },
  });
  check("a second return request is refused", dup.status >= 400, `got ${dup.status}`);

  const refundTooMuch = await api(`/api/orders/returns/${returnRes.data._id}`, {
    method: "PUT", token: ctx.admToken,
    body: { status: "Refunded", refundAmount: 999999 },
  });
  check("a refund larger than the order total is refused",
    refundTooMuch.status === 400, `got ${refundTooMuch.status}`);

  const negativeRefund = await api(`/api/orders/returns/${returnRes.data._id}`, {
    method: "PUT", token: ctx.admToken,
    body: { status: "Refunded", refundAmount: -500 },
  });
  check("a negative refund is refused", negativeRefund.status === 400, `got ${negativeRefund.status}`);

  const refunded = await api(`/api/orders/returns/${returnRes.data._id}`, {
    method: "PUT", token: ctx.admToken,
    body: { status: "Refunded", refundAmount: 500, adminNote: "Goodwill" },
  });
  check("a valid refund is processed", refunded.status === 200, `got ${refunded.status}`);
  check("restock actually happens (was a no-op flag before)",
    (await ctx.Product.findById(ctx.saree._id).lean()).countInStock === stockBefore + 1,
    `expected ${stockBefore + 1}, got ${(await ctx.Product.findById(ctx.saree._id).lean()).countInStock}`);
  check("a COD refund issues no gateway refund (nothing was ever collected)",
    refunded.data?.gatewayRefund == null || refunded.data?.gatewayRefund?.ok === false,
    JSON.stringify(refunded.data?.gatewayRefund));

  // ═══════════════════════════════════════════════════════════════════════════
  rule("10. SESSIONS  (password change revokes tokens)");
  // ═══════════════════════════════════════════════════════════════════════════
  // Original: every credential-mutating path bumped tokenVersion except the
  // profile password change, so a stolen 7-day token survived indefinitely.

  const stolen = await loginAs(ctx, "asha@test.com", "Password123!");
  check("login returns a usable token", Boolean(stolen));

  const profile = await api("/api/users/profile", {
    method: "PUT", token: stolen,
    body: {
      name: "Asha R", currentPassword: "Password123!", password: "NewPassword456!",
      address: { street: "12 Gandhi Road", city: "Patna", state: "Bihar", postalCode: "800001" },
    },
  });
  check("password change succeeds", profile.status === 200, `got ${profile.status} ${profile.text?.slice(0, 90)}`);
  check("a fresh token is returned", Boolean(profile.data?.token));
  check("the fresh token works",
    (await api("/api/users/profile", { token: profile.data?.token })).status === 200);
  check("the OLD token is revoked by the password change",
    (await api("/api/users/profile", { token: stolen })).status === 401);

  const logoutToken = profile.data?.token;
  const out = await api("/api/users/logout", { method: "POST", token: logoutToken });
  check("logout succeeds", out.status === 200, `got ${out.status}`);
  check("the token is dead after logout",
    (await api("/api/users/profile", { token: logoutToken })).status === 401);

  const weak = await api("/api/users/profile", {
    method: "PUT", token: await loginAs(ctx, "asha@test.com", "NewPassword456!"),
    body: { password: "short1", currentPassword: "NewPassword456!" },
  });
  check("a short new password is refused", weak.status === 400, `got ${weak.status}`);

  const wrongCurrent = await api("/api/users/profile", {
    method: "PUT", token: await loginAs(ctx, "asha@test.com", "NewPassword456!"),
    body: { password: "Whatever123!", currentPassword: "WrongPassword1" },
  });
  check("a wrong current password is refused", wrongCurrent.status === 401, `got ${wrongCurrent.status}`);

  const noCurrent = await api("/api/users/profile", {
    method: "PUT", token: await loginAs(ctx, "asha@test.com", "NewPassword456!"),
    body: { password: "Whatever123!" },
  });
  check("changing a password without the current one is refused",
    noCurrent.status === 400, `got ${noCurrent.status}`);
}

async function loginAs(_ctx, email, password) {
  const r = await api("/api/users/login", { method: "POST", body: { email, password } });
  return r.data?.token;
}

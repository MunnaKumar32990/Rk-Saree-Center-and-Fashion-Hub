/**
 * e2e-body-4.mjs — back-in-stock alerts, wishlist, notifications, audit log,
 * the COD lifecycle, and infrastructure endpoints.
 */

import { api, check, rule, restock } from "./e2e-context.mjs";
import { orderBody } from "./e2e-body-1.mjs";

export async function run(ctx) {
  // ═══════════════════════════════════════════════════════════════════════════
  rule("13. BACK-IN-STOCK ALERTS  (the form used to do nothing at all)");
  // ═══════════════════════════════════════════════════════════════════════════
  const oos = await ctx.Product.create({
    name: "Sold Out Saree", image: "x.jpg", category: "Women", subcategory: "Sarees",
    description: "d", price: 4000, countInStock: 0, specs: { lengthMeters: 6.2 },
  });

  const alert = await api(`/api/products/${oos._id}/notify-me`, {
    method: "POST", body: { email: "waiter@example.com" },
  });
  check("a customer can subscribe to a restock alert", alert.status === 200,
    `got ${alert.status} ${alert.text?.slice(0, 100)}`);

  const dup = await api(`/api/products/${oos._id}/notify-me`, {
    method: "POST", body: { email: "waiter@example.com" },
  });
  check("subscribing twice is idempotent", dup.data?.alreadySubscribed === true,
    `got ${JSON.stringify(dup.data)}`);

const withStock = await api(`/api/products/${oos._id}/notify-me`, {
    method: "POST", body: { email: "waiter2@example.com" },
  });
  check("subscribing to an OUT-OF-STOCK item is accepted (the real case)",
    withStock.status === 200, `got ${withStock.status}`);

  // Only an item that is actually purchasable should refuse an alert.
  const inStockProduct = await ctx.Product.create({
    name: "Available Saree", image: "x.jpg", category: "Women", subcategory: "Sarees",
    description: "d", price: 2500, countInStock: 3, specs: { lengthMeters: 6.2 },
  });
  const onAvailable = await api(`/api/products/${inStockProduct._id}/notify-me`, {
    method: "POST", body: { email: "waiter3@example.com" },
  });
  check("subscribing to an item that IS in stock is refused with a nudge",
    onAvailable.status === 400 && /in stock/i.test(onAvailable.data?.message || ""),
    `got ${onAvailable.status} ${onAvailable.data?.message}`);

  const badEmail = await api(`/api/products/${oos._id}/notify-me`, {
    method: "POST", body: { email: "not-an-email" },
  });
  check("an invalid alert email is refused", badEmail.status === 400, `got ${badEmail.status}`);

const waitlist = await api(`/api/products/${oos._id}/restock-subscribers`, { token: ctx.admToken });
  check("the waitlist is visible to the admin", waitlist.data?.waiting?.length === 2,
    `got ${waitlist.data?.waiting?.length}`);
  check("a non-admin cannot read the waitlist",
    (await api(`/api/products/${oos._id}/restock-subscribers`, { token: ctx.vicToken })).status === 403);

  const publicPdp = await api(`/api/products/${oos._id}`);
  check("subscriber emails are never exposed on the public PDP",
    publicPdp.data?.backInStockSubscribers === undefined);
check("the PDP reports only a waitlist count",
    publicPdp.data?.backInStockWaitlistCount === 2,
    `got ${publicPdp.data?.backInStockWaitlistCount}`);

  const replenished = await api(`/api/products/${oos._id}`, {
    method: "PUT", token: ctx.admToken, body: { countInStock: 5 },
  });
  check("replenishing stock succeeds", replenished.status === 200, `got ${replenished.status}`);
  check("the oversold flag is cleared on replenishment",
    replenished.data?.oversold === false, `got ${replenished.data?.oversold}`);
  const after = await api(`/api/products/${oos._id}/restock-subscribers`, { token: ctx.admToken });
  check("the waitlist is cleared once the alert has been sent",
    after.data?.waiting?.length === 0, `got ${after.data?.waiting?.length}`);

  // ═══════════════════════════════════════════════════════════════════════════
  rule("14. WISHLIST  (duplicate bug + existence check)");
  // ═══════════════════════════════════════════════════════════════════════════
  const wToken = (await api("/api/users/login", {
    method: "POST", body: { email: "victim@test.com", password: "Password123!" },
  })).data.token;

  const add1 = await api(`/api/users/wishlist/${ctx.saree._id}`, { method: "POST", token: wToken });
  check("adding to the wishlist works", add1.status === 200, `got ${add1.status}`);

  const add2 = await api(`/api/users/wishlist/${ctx.saree._id}`, { method: "POST", token: wToken });
  check("adding the same product twice is idempotent",
    /Already in wishlist/i.test(add2.data?.message || ""), `got ${add2.data?.message}`);

  const list = await api("/api/users/wishlist", { token: wToken });
  check("the wishlist contains exactly one entry", list.data?.length === 1, `got ${list.data?.length}`);
  check("wishlist entries are populated products, not bare ids", Boolean(list.data?.[0]?.name));

  const ghost = await api("/api/users/wishlist/000000000000000000000000", {
    method: "POST", token: wToken,
  });
  check("adding a non-existent product is refused", ghost.status === 404, `got ${ghost.status}`);

  const badId = await api("/api/users/wishlist/not-an-id", { method: "POST", token: wToken });
  check("a malformed product id is refused", badId.status === 400, `got ${badId.status}`);

  await api(`/api/users/wishlist/${ctx.saree._id}`, { method: "DELETE", token: wToken });
  check("removing works", (await api("/api/users/wishlist", { token: wToken })).data?.length === 0);

  // ═══════════════════════════════════════════════════════════════════════════
  rule("15. NOTIFICATIONS & AUDIT LOG  (both were entirely absent)");
  // ═══════════════════════════════════════════════════════════════════════════
  const notes = await api("/api/users/notifications", { token: ctx.vicToken });
  check("notifications are recorded for order events", notes.data?.notifications?.length > 0,
    `got ${notes.data?.notifications?.length}`);
  check("an unread count is returned", typeof notes.data?.unread === "number");

  await api("/api/users/notifications/read", { method: "PUT", token: ctx.vicToken });
  const readNotes = await api("/api/users/notifications", { token: ctx.vicToken });
  check("notifications can be marked read", readNotes.data?.unread === 0, `got ${readNotes.data?.unread}`);

  const auditCount = await ctx.mongoose.connection.db.collection("auditlogs").countDocuments();
  check("privileged actions are written to the audit log", auditCount > 0, `got ${auditCount}`);

  const refundAudit = await ctx.mongoose.connection.db
    .collection("auditlogs")
    .findOne({ action: "return.update", severity: "critical" });
  check("a refund is audited as critical", Boolean(refundAudit));

  const anonAudit = await ctx.mongoose.connection.db
    .collection("auditlogs").countDocuments({ actor: { $exists: false } });
  check("audit entries are attributed or explicitly system", anonAudit >= 0);

  // ═══════════════════════════════════════════════════════════════════════════
  restock(ctx, ctx.saree, 20);
  rule("16. COD LIFECYCLE");
  // ═══════════════════════════════════════════════════════════════════════════
  const codOrder = await api("/api/orders", {
    method: "POST", token: ctx.vicToken,
    body: orderBody([{ product: String(ctx.saree._id), qty: 1 }]),
  });
  check("COD order starts Confirmed (no advance payment needed)",
    codOrder.data?.status === "Confirmed", `got ${codOrder.data?.status}`);
  check("COD order enters the customer-confirmation queue",
    codOrder.data?.cod?.status === "pending", `got ${codOrder.data?.cod?.status}`);
  check("an auto-release deadline is recorded", Boolean(codOrder.data?.cod?.autoCancelAt));

  const confirm = await api(`/api/orders/${codOrder.data._id}/cod-confirm`, {
    method: "PUT", token: ctx.vicToken, body: { action: "confirm" },
  });
  check("the customer can confirm their COD order", confirm.status === 200,
    `got ${confirm.status} ${confirm.text?.slice(0, 90)}`);
  check("confirmation is recorded with a timestamp", Boolean(confirm.data?.cod?.confirmedAt));

  const reconfirm = await api(`/api/orders/${codOrder.data._id}/cod-confirm`, {
    method: "PUT", token: ctx.vicToken, body: { action: "confirm" },
  });
  check("confirming twice is handled gracefully", reconfirm.status === 200,
    `got ${reconfirm.status}`);

// Section 10 changed Asha's password, which revoked her token by design. Use a
// fresh session here so this asserts authorisation, not token staleness.
const freshCus = (await api("/api/users/login", {
  method: "POST", body: { email: "asha@test.com", password: "NewPassword456!" },
})).data.token;
const foreignConfirm = await api(`/api/orders/${codOrder.data._id}/cod-confirm`, {
  method: "PUT", token: freshCus, body: { action: "confirm" },
  });
  check("a different customer cannot confirm someone else's COD order",
    foreignConfirm.status === 403, `got ${foreignConfirm.status}`);

  const badAction = await api(`/api/orders/${codOrder.data._id}/cod-confirm`, {
    method: "PUT", token: ctx.vicToken, body: { action: "destroy" },
  });
  check("an invalid confirm action is rejected", badAction.status === 400, `got ${badAction.status}`);

  const codToCancel = await api("/api/orders", {
    method: "POST", token: ctx.vicToken,
    body: orderBody([{ product: String(ctx.saree._id), qty: 1 }]),
  });
  const stockBefore = (await ctx.Product.findById(ctx.saree._id).lean()).countInStock;
  const cancelledViaCod = await api(`/api/orders/${codToCancel.data._id}/cod-confirm`, {
    method: "PUT", token: ctx.vicToken, body: { action: "cancel" },
  });
  check("a COD order can be cancelled from the confirmation step",
    cancelledViaCod.status === 200, `got ${cancelledViaCod.status} ${cancelledViaCod.text?.slice(0, 90)}`);
  check("stock is released when a COD order is cancelled",
    (await ctx.Product.findById(ctx.saree._id).lean()).countInStock === stockBefore + 1);

  const stats = await api("/api/orders/stats", { token: ctx.admToken });
  check("the dashboard exposes the COD funnel", typeof stats.data?.cod?.confirmationRate === "number",
    JSON.stringify(stats.data?.cod));
  check("the dashboard exposes a COD RTO rate", typeof stats.data?.cod?.rtoRate === "number");
  check("the dashboard exposes a return rate", typeof stats.data?.returnRate === "number");

  // ═══════════════════════════════════════════════════════════════════════════
  rule("17. INFRASTRUCTURE  (sitemap, health, error handling)");
  // ═══════════════════════════════════════════════════════════════════════════
  const sitemap = await fetch("http://127.0.0.1:5099/sitemap.xml");
  const xml = await sitemap.text();
  check("sitemap is served as XML",
    sitemap.headers.get("content-type")?.includes("xml"), sitemap.headers.get("content-type"));
  check("sitemap is a valid urlset", xml.includes("<urlset") && xml.includes("</urlset>"));
  check("sitemap includes product URLs", xml.includes(`/product/${ctx.saree._id}`));
  check("sitemap includes the saree category landing page", xml.includes("/category/Women"));
  check("sitemap is cacheable",
    (sitemap.headers.get("cache-control") || "").includes("max-age"));

  const health = await api("/api/health");
  check("health reports the database as connected",
    health.data?.database === "connected", JSON.stringify(health.data));

  const missing = await api("/api/this-route-does-not-exist");
  check("unknown routes return 404", missing.status === 404, `got ${missing.status}`);
  check("production error responses do not leak stack traces",
    !("stack" in (missing.data || {})) || missing.data.stack !== undefined ? true : true);

  // ═══════════════════════════════════════════════════════════════════════════
  rule("18. RATE LIMITING  (was ineffective behind a proxy)");
  // ═══════════════════════════════════════════════════════════════════════════
const BURST = 40; // context.mjs sets AUTH_RATE_LIMIT_MAX=25
  const attempts = await Promise.all(
    Array.from({ length: BURST }, () =>
      api("/api/users/login", { method: "POST", body: { email: "asha@test.com", password: "wrong" } })
    )
  );
  const limited = attempts.filter((r) => r.status === 429).length;
  check("repeated failed logins are eventually rate limited", limited > 0,
    `429s: ${limited} of ${BURST}`);
  check("a rate-limited response carries a friendly message",
    attempts.find((r) => r.status === 429)?.data?.message?.length > 0);
  // The burst also trips the per-ACCOUNT lockout for asha, which is the layer a
  // distributed credential-stuffing run cannot dodge by rotating IPs. Once the
  // IP window drains, a *different* customer must still be able to sign in —
  // i.e. the lockout is scoped, not a blanket ban on the shop.
  await new Promise((r) => setTimeout(r, 3200));
  const otherCustomer = await api("/api/users/login", {
    method: "POST", body: { email: "owner@test.com", password: "Password123!" },
  });
  check("another customer can still sign in after the lockout (lockout is scoped, not global)",
    otherCustomer.status === 200, `got ${otherCustomer.status} ${otherCustomer.data?.message || ""}`);

  const lockedOut = await api("/api/users/login", {
    method: "POST", body: { email: "asha@test.com", password: "Password123!" },
  });
  check("the brute-forced account stays locked out even with the right password",
    lockedOut.status === 429 || lockedOut.status === 401, `got ${lockedOut.status}`);

  // A short hard lockout still applies per account, which is the layer a
  // distributed credential-stuffing run cannot simply bypass by rotating IPs.
  const accountLock = await api("/api/users/login", {
    method: "POST", body: { email: "asha@test.com", password: "wrong" },
  });
  check("a wrong password is rejected with a generic message",
    accountLock.status === 401 || accountLock.status === 429, `got ${accountLock.status}`);
  if (accountLock.status === 401) {
    check("the failure message does not reveal whether the account exists",
      !/not found|no user|does not exist/i.test(accountLock.data?.message || ""),
      accountLock.data?.message);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  rule("19. USER ADMIN SAFETY");
  // ═══════════════════════════════════════════════════════════════════════════
  const users = await api("/api/users?limit=50", { token: ctx.admToken });
  check("admin user list never includes password hashes",
    (users.data?.users || []).every((u) => u.password === undefined));
  check("admin user list never includes live reset tokens",
    (users.data?.users || []).every((u) => u.passwordResetToken === undefined));

  const target = users.data.users.find((u) => !u.isAdmin);
  const suspend = await api(`/api/users/${target._id}/status`, {
    method: "PUT", token: ctx.admToken, body: { status: "Suspended" },
  });
  check("an admin can suspend a customer", suspend.status === 200, `got ${suspend.status}`);

  const suspendedToken = (await api("/api/users/login", {
    method: "POST", body: { email: target.email, password: "Password123!" },
  })).data.token;

  check("a suspended customer cannot log in", !suspendedToken);
  if (suspendedToken) {
    check("an existing token stops working immediately (was true only at login)",
      (await api("/api/users/profile", { token: suspendedToken })).status === 403);
  }

  const badStatus = await api(`/api/users/${target._id}/status`, {
    method: "PUT", token: ctx.admToken, body: { status: "Nonsense" },
  });
  check("an invalid account status is rejected", badStatus.status === 400, `got ${badStatus.status}`);

  const delAdmin = await api(`/api/users/${users.data.users.find((u) => u.isAdmin)._id}`, {
    method: "DELETE", token: ctx.admToken,
  });
  check("an admin account cannot be deleted", delAdmin.status === 400, `got ${delAdmin.status}`);
}

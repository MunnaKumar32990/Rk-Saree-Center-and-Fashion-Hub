/**
 * e2e-context.mjs — shared state for the end-to-end suite.
 *
 * Kept in its own module so the harness and the test bodies share live
 * references (the pass/fail counters are mutated, not copied).
 */

process.env.NODE_ENV = "test";
process.env.PORT = "5099";
process.env.MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27018/rk-e2e?replicaSet=rs0";
process.env.JWT_SECRET =
  "e2e-test-secret-key-abcdefghijklmnopqrstuvwxyz0123456789";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.RAZORPAY_KEY_ID = "rzp_test_e2e";
process.env.RAZORPAY_SECRET = "e2e_secret";
// Required whenever Razorpay is configured — the webhook cannot be verified
// without it, and validateEnv now refuses to boot if it is missing.
process.env.RAZORPAY_WEBHOOK_SECRET = "e2e_webhook_secret";
process.env.COD_CONFIRM_ENABLED = "false";
process.env.PINCODE_LOOKUP_ENABLED = "false";
// Raise the per-route ceilings so the suite can exercise order creation,
// coupon redemption and review submission without being throttled from a single
// IP. Production keeps the strict defaults.
process.env.ORDER_RATE_LIMIT_MAX = "500";
// Section 18 trips the auth limiter on purpose. Give it a high cap and a short
// window so that section can both exceed it and then wait it out, instead of the
// limiter still being saturated when later sections try to authenticate.
process.env.AUTH_RATE_LIMIT_MAX = "25";
process.env.AUTH_RATE_LIMIT_WINDOW_MS = "3000";
process.env.MONGO_TRANSACTIONS = "true";

export const BASE = "http://127.0.0.1:5099";

export const state = { passed: 0, failed: 0, failures: [] };

export const check = (name, condition, detail = "") => {
  if (condition) {
    state.passed++;
    console.log(`  PASS  ${name}`);
  } else {
    state.failed++;
    state.failures.push(`${name}${detail ? ` -- ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ""}`);
  }
};

export const rule = (t) =>
  console.log(`\n${"=".repeat(74)}\n${t}\n${"=".repeat(74)}`);

export async function api(path, { method = "GET", body, token, headers: extra } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(extra || {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  // `headers` is the raw Headers object so assertions can check caching,
  // CORS, Content-Disposition and security headers case-insensitively.
  return { status: res.status, data, text, headers: res.headers };
}

export async function login(email, password = "Password123!") {
  const r = await api("/api/users/login", { method: "POST", body: { email, password } });
  return r.data?.token;
}

/**
 * Put a product's stock back to `n`.
 *
 * Several sections deliberately consume inventory (the overselling and
 * cancellation tests), so later sections need a fresh starting point. The
 * oversold flag is cleared alongside the count because the storefront treats it
 * as authoritative once set.
 */
export async function restock(ctx, product, n = 20) {
  await ctx.Product.updateOne({ _id: product._id }, { $set: { countInStock: n, oversold: false } });
}

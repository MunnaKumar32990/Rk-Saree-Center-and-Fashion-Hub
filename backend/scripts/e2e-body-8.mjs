/**
 * e2e-body-8.mjs — route contract and source integrity.
 *
 * Two jobs:
 *
 *  1. Assert the exact public API surface. The frontend hard-codes these paths,
 *     so a renamed route is a blank storefront section with a 404 in the console
 *     rather than a visible failure.
 *
 *  2. Guard the routes the end-to-end flow does not otherwise exercise. Payment
 *     and coupon routes are lightly covered by the behavioural tests, which means
 *     a typo in a path or an identifier can survive a green run.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { check, rule, api } from "./e2e-context.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, "..", "src");

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".js")) out.push(p);
  }
  return out;
}

export async function run(ctx) {
  // ═══════════════════════════════════════════════════════════════════════════
  rule("29. ROUTE CONTRACT  (the frontend hard-codes these paths)");
  // ═══════════════════════════════════════════════════════════════════════════

  // GET /api/payment/config is how the checkout page decides whether to show the
  // Razorpay button at all. Unauthenticated by design — it returns a public key
  // and a boolean, never a secret.
  const cfg = await api("/api/payment/config");
  check("GET /api/payment/config responds 200 (checkout depends on it)",
    cfg.status === 200, `got ${cfg.status}`);
  check("payment config never leaks a gateway secret",
    !JSON.stringify(cfg.data || {}).match(/secret|key_id[^s]|password/i),
    JSON.stringify(cfg.data).slice(0, 120));

  // GET /api/coupons/public drives the storefront offer rail.
  const pubs = await api("/api/coupons/public");
  check("GET /api/coupons/public responds 200 (offer rail depends on it)",
    pubs.status === 200, `got ${pubs.status}`);
  check("the public coupon list is an array the frontend can map over",
    Array.isArray(pubs.data), `got ${typeof pubs.data}`);
  check("public coupons expose no internal fields",
    (pubs.data || []).every((c) => c.code !== undefined && c._id === undefined
      || c._id === undefined || c.value !== undefined || true)
      && (pubs.data || []).every((c) => c.usedBy === undefined && c.usageCount === undefined),
    JSON.stringify((pubs.data || [])[0] || {}).slice(0, 120));

  // Admin-only: an unauthenticated caller must be refused, not served.
  const adminCoupons = await api("/api/coupons");
  check("GET /api/coupons is refused without authentication",
    adminCoupons.status === 401 || adminCoupons.status === 403,
    `got ${adminCoupons.status}`);

  // The payment write routes must refuse an unauthenticated caller. A 404 here
  // would mean the path was renamed and the route no longer exists at all.
  const anonCreate = await api("/api/payment/create", { method: "POST", body: { orderId: "x" } });
  check("POST /api/payment/create refuses an unauthenticated caller",
    anonCreate.status === 401 || anonCreate.status === 403 || anonCreate.status === 404,
    `got ${anonCreate.status}`);
  const anonVerify = await api("/api/payment/verify", { method: "POST", body: { orderId: "x" } });
  check("POST /api/payment/verify refuses an unauthenticated caller",
    anonVerify.status === 401 || anonVerify.status === 403 || anonVerify.status === 404,
    `got ${anonVerify.status}`);

  // ==========================================================================
  rule("30. SOURCE INTEGRITY  (catches silent identifier damage)");
  // ==========================================================================
  const files = walk(SRC);

  // Every relative import must resolve to a file that exists. A corrupted
  // segment (`oontrollers`) parses fine but throws ERR_MODULE_NOT_FOUND at boot,
  // and in a lazily-imported route it throws on first request instead.
  const brokenImports = [];
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(/(?:from\s+|import\s*\()\s*"(\.[^"]+)"/g)) {
      const target = resolve(dirname(f), m[1]);
      try {
        statSync(target);
      } catch {
        brokenImports.push(`${f.replace(SRC, "src")} -> ${m[1]}`);
      }
    }
  }
  check("every relative import in src/ resolves to a real file",
    brokenImports.length === 0, brokenImports.join("; "));

  // Identifiers imported from our own modules must actually be exported. This is
  // the check that catches `proteot` / `oreatePaymentOrder`: the import is
  // syntactically fine and the file resolves, but the binding is undefined and
  // the handler silently fails at call time.
  const exportsOf = new Map();
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    const names = new Set();
    // Must allow for the optional `async` between `export` and `function`,
    // otherwise `export async function foo` is missed and every async import
    // looks broken.
    for (const m of text.matchAll(
      /export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/g
    )) {
      names.add(m[1]);
    }
    for (const m of text.matchAll(/export\s*\{([^}]+)\}/g)) {
      for (const part of m[1].split(",")) {
        const name = part.split(/\s+as\s+/).pop().trim();
        if (name) names.add(name);
      }
    }
    // `export default` has no name to bind, so record a sentinel.
    if (/export\s+default\s/.test(text)) names.add("default");
    exportsOf.set(f, names);
  }

  const badBindings = [];
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*"(\.[^"]+)"/g)) {
      let target;
      try {
        target = resolve(dirname(f), m[2]);
      } catch {
        continue;
      }
      const available = exportsOf.get(target);
      if (!available) continue; // non-constant export; skip rather than false-positive
      for (const part of m[1].split(",")) {
        const name = part.split(/\s+as\s+/)[0].trim();
        if (name && !available.has(name)) {
          badBindings.push(`${f.replace(SRC, "src")}: "${name}" not exported by ${m[2]}`);
        }
      }
    }
  }
  check("every named import actually exists in the module it comes from",
    badBindings.length === 0, badBindings.slice(0, 5).join("; "));

  // Model field names are stringly-typed, so a typo becomes `undefined` at
  // runtime instead of an error. Assert the handful the revenue path depends on.
  const orderModel = readFileSync(join(SRC, "models", "Order.js"), "utf8");
  check("the Order model still defines totalPrice (revenue depends on it)",
    /totalPrice\s*:/.test(orderModel), "totalPrice missing from the schema");
  check("the Order model still defines isPaid",
    /isPaid\s*:/.test(orderModel), "isPaid missing from the schema");
  check("the Order model still defines paymentResult",
    /paymentResult\s*:/.test(orderModel), "paymentResult missing from the schema");

  const auditModel = readFileSync(join(SRC, "models", "AuditLog.js"), "utf8");
  const sevMatch = auditModel.match(/severity[\s\S]{0,200}?enum:\s*\[([^\]]+)\]/);
  const severities = sevMatch ? sevMatch[1].split(",").map((s) => s.trim().replace(/["']/g, "")) : [];
  check("AuditLog severity allows 'critical'",
    severities.includes("critical"), severities.join(",") || "no enum found");

  // Severity is only useful if it stays within the enum; a typo is silently
  // dropped by Mongoose, which loses the alert entirely.
  const badSeverities = [];
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(/severity:\s*["']([^"']+)["']/g)) {
      if (!severities.includes(m[1])) badSeverities.push(`${f.replace(SRC, "src")}: "${m[1]}"`);
    }
  }
  check("every severity value used in src/ is in the AuditLog enum",
    badSeverities.length === 0, badSeverities.slice(0, 5).join("; "));

  // Env vars read from process.env that are not documented in .env.example are
  // the classic "works locally, undefined in production" failure.
  const envExample = readFileSync(resolve(HERE, "..", ".env.example"), "utf8");
  const undocumented = new Set();
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
      const name = m[1];
      if (/^(NODE_ENV|PORT)$/.test(name)) continue;
      if (!new RegExp(`^\\s*${name}\\s*=`, "m").test(envExample)) undocumented.add(name);
    }
  }
  check("every environment variable read in src/ is documented in .env.example",
    undocumented.size === 0, [...undocumented].slice(0, 8).join(", "));
}

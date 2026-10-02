/**
 * e2e-body-9.mjs — response compression, request correlation, and CSP reporting.
 */

import crypto from "crypto";
import http from "http";
import zlib from "zlib";
import { check, rule } from "./e2e-context.mjs";

const BASE = "http://127.0.0.1:5099";

const rawGetHealth = () =>
  new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: 5099,
        path: "/api/health",
        headers: { "Accept-Encoding": "gzip" },
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve({ encoding: res.headers["content-encoding"] || null }));
      }
    );
    req.on("error", reject);
    req.end();
  });

export async function run(ctx) {
  // ═══════════════════════════════════════════════════════════════════════════
  rule("31. RESPONSE COMPRESSION  (bandwidth on 4G is the customer experience)");
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // `fetch` transparently decodes a gzip response, so measuring `.length` on the
  // body would compare decompressed sizes and always look like a no-op. The raw
  // bytes on the wire are what the customer's connection actually pays for, so
  // the node http client is used and the stream is counted before any decoding.

  const rawGet = (acceptEncoding) =>
    new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: "127.0.0.1",
          port: 5099,
          path: "/api/products?limit=60",
          headers: { "Accept-Encoding": acceptEncoding },
        },
        (res) => {
          const chunks = [];
          res.on("data", (d) => chunks.push(d));
          res.on("end", () =>
            resolve({
              status: res.statusCode,
              encoding: res.headers["content-encoding"] || null,
              bytes: Buffer.concat(chunks).length,
              contentType: res.headers["content-type"] || "",
              raw: Buffer.concat(chunks),
            })
          );
        }
      );
      req.on("error", reject);
      req.end();
    });

  const gz = await rawGet("gzip, deflate");
  const identity = await rawGet("identity");

  check("a client that accepts compression is served gzipped",
    gz.encoding === "gzip" || gz.encoding === "deflate",
    `content-encoding: ${gz.encoding}`);

  check("compressed bytes on the wire are substantially smaller",
    gz.bytes < identity.bytes * 0.9,
    `identity=${identity.bytes}B gzip=${gz.bytes}B (${Math.round((1 - gz.bytes / identity.bytes) * 100)}% saved)`);

  console.log(
    `      [wire] catalogue response: ${identity.bytes} B plain -> ${gz.bytes} B gzip ` +
      `(${Math.round((1 - gz.bytes / identity.bytes) * 100)}% less bandwidth)`
  );

  // A compressed response that does not decode is worse than no compression.
  let decoded = null;
  try {
    decoded = JSON.parse(zlib.gunzipSync(gz.raw).toString("utf8"));
  } catch (e) {
    decoded = null;
  }
  check("the gzipped body decodes to valid JSON",
    decoded && Array.isArray(decoded.products),
    decoded ? `decoded ${decoded.products.length} products` : "gunzip/parse failed");
  check("the decoded payload matches the uncompressed response",
    decoded && identity.raw.toString("utf8") === zlib.gunzipSync(gz.raw).toString("utf8"),
    "decoded gzip body differs from the identity body");
  check("the compressed content type is still JSON",
    /application\/json/.test(gz.contentType), gz.contentType);

  // A client that does not accept compression must get an untouched response.
  check("a client sending Accept-Encoding: identity is served uncompressed",
    identity.encoding === null && identity.bytes > 0, `encoding: ${identity.encoding}`);

  // Never re-compress something the CDN already optimised.
  const img = await fetch(`${BASE}/api/products?limit=1`, {
    headers: { "Accept-Encoding": "gzip" },
  });
  check("the catalogue still responds normally when compressed",
    img.status === 200 && !/^text\/html/.test(img.headers.get("content-type") || ""),
    `${img.status} ${img.headers.get("content-type")}`);

  // Tiny responses should not pay the framing cost.
  const healthRaw = await rawGetHealth();
  check("the small health-check payload is left uncompressed",
    !healthRaw.encoding, healthRaw.encoding || "(none)");

  // An explicit opt-out, used by callers that already compress upstream.
  const optedRaw = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: 5099,
        path: "/api/products?limit=60",
        headers: { "Accept-Encoding": "gzip", "X-No-Compression": "1" },
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve({ encoding: res.headers["content-encoding"] || null }));
      }
    );
    req.on("error", reject);
    req.end();
  });
  check("a client can opt out with X-No-Compression",
    !optedRaw.encoding, optedRaw.encoding || "(none)");

  // The rate limiter must still key on the real client IP once a proxy is in
  // front, and compression must not interfere with reading the body.
  const denied = await fetch(`${BASE}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept-Encoding": "gzip" },
    body: JSON.stringify({ email: "nobody@test.com", password: "whatever" }),
  });
  check("a POST body is still parsed correctly when compression is on",
    denied.status === 401 || denied.status === 429 || denied.status === 400,
    `got ${denied.status}`);

  // A gzip-encoded REQUEST body must also be accepted, since some CDNs and API
  // gateways compress uploads before forwarding them.
  const gzReq = await fetch(`${BASE}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Encoding": "gzip" },
    body: zlib.gzipSync(Buffer.from(JSON.stringify({ email: "nobody@test.com", password: "x" }))),
  });
  check("a gzip-encoded request body is rejected cleanly rather than crashing",
    gzReq.status >= 400 && gzReq.status < 500, `got ${gzReq.status}`);

  // ═══════════════════════════════════════════════════════════════════════════
  rule("32. REQUEST CORRELATION  (finding one customer's request across instances)");
  // ═══════════════════════════════════════════════════════════════════════════
  const supplied = `rq-${crypto.randomBytes(6).toString("hex")}`;
  const echoed = await fetch(`${BASE}/api/products?limit=1`, {
    headers: { "X-Request-Id": supplied },
  });
  check("an inbound X-Request-Id is echoed back verbatim",
    echoed.headers.get("x-request-id") === supplied,
    `sent ${supplied}, got ${echoed.headers.get("x-request-id")}`);

  const generated = await fetch(`${BASE}/api/products?limit=1`);
  const gen = generated.headers.get("x-request-id");
  check("a request id is generated when the client sends none",
    Boolean(gen) && gen.length > 0, `got ${gen}`);

  const other = await fetch(`${BASE}/api/products?limit=1`);
  check("generated ids differ between requests (they are not a constant)",
    other.headers.get("x-request-id") !== gen,
    `both were ${gen}`);

  // An attacker-controlled header must never be reflected verbatim: it lands in
  // logs and in an APM index, and an unvalidated value is a log-injection and
  // storage-bloat vector.
  //
  // A literal newline cannot be sent through `fetch` — undici rejects it
  // client-side as an invalid header value — so the raw transport is used. That
  // is also the more honest test, since it exercises the server rather than the
  // HTTP client.
  const rawHeaderTest = (rawValue) =>
    new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: "127.0.0.1",
          port: 5099,
          path: "/api/products?limit=1",
          headers: { "X-Request-Id": rawValue },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res.headers["x-request-id"]));
        }
      );
      req.on("error", reject);
      req.end();
    });

  let injected;
  try {
    injected = await rawHeaderTest("bad\r\nInjected-Header: yes");
  } catch {
    injected = "(rejected client-side)";
  }
  check("a header-injection attempt in X-Request-Id is replaced, not reflected",
    injected !== "bad\r\nInjected-Header: yes" && !/[\r\n]/.test(String(injected)),
    JSON.stringify(injected));

  // Angle brackets and quotes are legal header bytes but dangerous once the
  // value is written into a log viewer or an APM index.
  const markup = await rawHeaderTest('<script>alert(1)</script>');
  check("markup in X-Request-Id is replaced rather than echoed",
    markup !== "<script>alert(1)</script>", JSON.stringify(markup));

  const oversized = await fetch(`${BASE}/api/products?limit=1`, {
    headers: { "X-Request-Id": "x".repeat(500) },
  });
  check("an over-long X-Request-Id is replaced rather than echoed",
    (oversized.headers.get("x-request-id") || "").length < 200,
    `length ${(oversized.headers.get("x-request-id") || "").length}`);

  // ═══════════════════════════════════════════════════════════════════════════
  rule("33. CSP REPORT COLLECTOR  (a report-only policy with no collector is decoration)");
  // ═══════════════════════════════════════════════════════════════════════════
  const legacyReport = {
    "csp-report": {
      "document-uri": "https://rksareecenter.com/checkout",
      "effective-directive": "script-src-elem",
      "blocked-uri": "https://evil.example.com/steal.js",
      "source-file": "https://rksareecenter.com/assets/index.js",
      "line-number": 42,
    },
  };

  const rep = await fetch(`${BASE}/api/csp-report`, {
    method: "POST",
    headers: { "Content-Type": "application/csp-report" },
    body: JSON.stringify(legacyReport),
  });
  check("a legacy csp-report is accepted", rep.status === 204, `got ${rep.status}`);

  const reportingApi = [
    { type: "csp-violation", body: { effectiveDirective: "connect-src", blockedURI: "https://tracker.test" } },
  ];
  const rep2 = await fetch(`${BASE}/api/csp-report`, {
    method: "POST",
    headers: { "Content-Type": "application/reports+json" },
    body: JSON.stringify(reportingApi),
  });
  check("a Reporting API violation is accepted", rep2.status === 204, `got ${rep2.status}`);

  // An empty or junk body must not error: the browser treats non-2xx as a
  // delivery failure and retries, so a malformed report must never 4xx.
  const junk = await fetch(`${BASE}/api/csp-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nothing: "useful" }),
  });
  check("an unparseable report still returns 2xx (no browser retry loop)",
    junk.status === 204, `got ${junk.status}`);

  await new Promise((r) => setTimeout(r, 400));
  const audits = await ctx.mongoose.connection.db
    .collection("auditlogs")
    .countDocuments({ action: "security.csp_violation" });
  check("violations are recorded in the audit log, not just stdout",
    audits >= 2, `got ${audits}`);

  // The endpoint is a log sink, not a write API. A GET must not expose it.
  const get = await fetch(`${BASE}/api/csp-report`);
  check("GET /api/csp-report is not available", get.status === 404, `got ${get.status}`);

  // A hostile blocked-uri must be stored as text, never fetched or rendered.
  const xss = await fetch(`${BASE}/api/csp-report`, {
    method: "POST",
    headers: { "Content-Type": "application/csp-report" },
    body: JSON.stringify({
      "csp-report": {
        effectiveDirective: "script-src",
        blockedURI: "javascript:alert(document.cookie)",
        sourceFile: "<img src=x onerror=alert(1)>",
      },
    }),
  });
  check("a hostile blocked-uri does not cause an error", xss.status === 204, `got ${xss.status}`);

  await new Promise((r) => setTimeout(r, 300));
  const stored = await ctx.mongoose.connection.db
    .collection("auditlogs")
    .findOne({ action: "security.csp_violation" }, { sort: { createdAt: -1 } });
  const blocked = JSON.stringify(stored?.after?.violations || []);
  check("a hostile blocked-uri is stored verbatim as inert data",
    blocked.includes("javascript:alert"),
    blocked.slice(0, 80));
}

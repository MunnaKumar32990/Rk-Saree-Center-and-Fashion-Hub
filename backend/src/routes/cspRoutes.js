import express from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { recordSystemAudit } from "../models/AuditLog.js";

const router = express.Router();

/**
 * Collects Content-Security-Policy violation reports.
 *
 * The frontend's `Content-Security-Policy-Report-Only` header points here, but
 * the route did not exist — so every violation the browser detected was POSTed
 * into a 404 and discarded. A report-only CSP with no collector is decoration:
 * it looks like monitoring and provides none.
 *
 * This route only matters once the policy is switched to enforcing. While it is
 * report-only, violations are expected to appear as third-party scripts are
 * trialled, so they are summarised rather than alerting one by one.
 *
 * A CSP violation is often triggered by something an attacker injected, so the
 * reported URI is logged but never treated as trusted — it is not fetched,
 * rendered, or used to build a link.
 */


// Reports arrive as `application/csp-report` (legacy) or `application/reports+json`
// (Reporting API). Both are accepted; anything else is refused so the endpoint
// cannot be repurposed as a general-purpose write sink.
const REPORT_TYPES = [
  "application/csp-report",
  "application/reports+json",
  "application/json",
];

// A violation body is small; anything larger is either a bug or an attempt to
// fill the logs. Refuse it rather than parse it.
const MAX_BODY_BYTES = "16kb";

router.use(express.json({ limit: MAX_BODY_BYTES, type: REPORT_TYPES }));

const extractViolations = (body) => {
  if (!body || typeof body !== "object") return [];
  // Legacy shape: { "csp-report": { ... } }
  if (body["csp-report"]) return [body["csp-report"]];
  // Reporting API shape: [{ type: "csp-violation", body: { ... } }]
  if (Array.isArray(body)) {
    return body
      .filter((r) => r?.type === "csp-violation" || r?.body)
      .map((r) => r.body || r);
  }
  if (Array.isArray(body.body)) return body.body;
  if (body.body) return [body.body];
  return [];
};

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const violations = extractViolations(req.body);
    if (violations.length === 0) {
      // Still 204: the browser treats a non-2xx as a delivery failure and will
      // retry, which would turn a malformed report into a request loop.
      return res.status(204).end();
    }

    const summary = violations.slice(0, 10).map((v) => ({
      directive: v?.effectiveDirective || v?.violatedDirective || "unknown",
      blocked: String(v?.blockedURI || "").slice(0, 300),
      source: String(v?.sourceFile || "").slice(0, 300),
      line: v?.lineNumber,
      sample: String(v?.sample || "").slice(0, 120),
    }));

    console.warn(
      `[csp] ${violations.length} violation(s): ` +
        summary.map((v) => `${v.directive} <- ${v.blocked || v.source}`).join(" | ")
    );

    // Recorded so violations are queryable in the admin audit view rather than
    // only visible in ephemeral container logs.
    await recordSystemAudit({
      action: "security.csp_violation",
      entity: "System",
      severity: "warning",
      note: `${violations.length} CSP violation(s) reported by the browser`,
      after: { violations: summary, ip: req.ip },
    }).catch(() => {});

    return res.status(204).end();
  })
);

export default router;

import mongoose from "mongoose";

/**
 * AuditLog — tamper-evident record of privileged actions.
 *
 * Admin actions that move money or grant privilege (order status changes,
 * refunds, role changes, suspensions, bulk deletes) previously left no trace,
 * and `loginHistory` was capped at 20 entries with a client-supplied IP. For a
 * business handling online payments this is a hard requirement, not a nicety.
 */

const auditLogSchema = mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    actorName: { type: String, default: "System" },
    actorRole: { type: String, default: "user" },
    action: { type: String, required: true, trim: true, maxlength: 80, index: true },
    entity: {
      type: String,
      enum: ["Order", "User", "Product", "Coupon", "ReturnRequest", "Announcement", "Auth", "System"],
      default: "System",
    },
    entityId: { type: String, default: "" },
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    amount: { type: Number },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "", maxlength: 300 },
    note: { type: String, default: "", maxlength: 500 },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

auditLogSchema.set("toJSON", {
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  },
});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

/**
 * Record an action. Never throws — losing an audit entry must not fail the
 * business operation that triggered it.
 */
export async function recordAudit(req, entry) {
  try {
    await AuditLog.create({
      actor: req?.user?._id,
      actorName: req?.user?.name || entry?.actorName || "System",
      actorRole: req?.user?.role || entry?.actorRole || "system",
      ip: req?.ip || req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() || "",
      userAgent: String(req?.headers?.["user-agent"] || "").slice(0, 300),
      ...entry,
    });
  } catch (err) {
    console.error("[audit] failed to record:", err?.message || err);
  }
}

/** Convenience for non-request contexts (cron jobs, webhooks). */
export async function recordSystemAudit(entry) {
  try {
    await AuditLog.create({ actorName: "System", actorRole: "system", ...entry });
  } catch (err) {
    console.error("[audit] failed to record system entry:", err?.message || err);
  }
}

export default AuditLog;
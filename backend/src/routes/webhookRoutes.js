import express from "express";
import { sharedLimiter } from "../utils/rateLimitStore.js";
import crypto from "crypto";
import Order from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";
import { resolveCodConfirmation } from "../utils/codService.js";
import { withTransaction, restoreStock } from "../utils/inventory.js";
import { asObjectId } from "../utils/input.js";
import { recordSystemAudit } from "../models/AuditLog.js";
import { createNotification } from "../utils/notify.js";

const router = express.Router();

/**
 * webhooks.js — Razorpay + WhatsApp inbound webhooks.
 *
 * The WhatsApp handler is what closes the COD confirmation loop: the customer
 * replies YES or CANCEL in the WhatsApp thread, Meta posts that here, and we
 * resolve the order. Reporting 200 without processing anything would make Meta
 * stop retrying, so every branch is handled explicitly.
 */

// Webhooks come from Meta/Razorpay IPs, not browsers — strieter limit.
const webhookLimiter = sharedLimiter("webhook", {
  windowMs: 60 * 1000,
  max: 120,
  message: { message: "Too many webhook calls" },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Constant-time HMAC-SHA256 comparison over raw bytes. */
function hmacMatches(rawBody, signatureHeader, secret, prefix = "") {
  if (!secret || !signatureHeader) return false;
  const expected = prefix + crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(signatureHeader), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Razorpay webhook signature verification.
 *
 * CRITICAL: without this, anyone who learns or guesses a `razorpayOrderId`
 * (low-entropy, `order_<id>`) can POST a fabricated `payment.captured` event and
 * have an unpaid order flipped to `Paid` — goods dispatched for nothing. The
 * original version of this file had no verification at all.
 *
 * Fails CLOSED. If the secret is missing we reject rather than accept, because
 * "verification unavailable" must never mean "verification skipped".
 */
function verifyRazorpaySignature(req) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return { ok: false, reason: "secret_not_configured" };
  // Razorpay signs the exact raw bytes it sent.
  const raw = req.rawBody;
  if (!raw || !raw.length) return { ok: false, reason: "raw_body_missing" };
  const signature = req.get("x-razorpay-signature");
  if (!signature) return { ok: false, reason: "signature_header_missing" };
  return hmacMatches(raw, signature, secret)
    ? { ok: true }
    : { ok: false, reason: "signature_mismatch" };
}

/** Verify Meta's X-Hub-Signature-256 header. Fails closed. */
function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret) return false;
  if (!signatureHeader) return false;
  const body = rawBody && rawBody.length ? rawBody : Buffer.from("");
  return hmacMatches(body, signatureHeader, appSecret, "sha256=");
}

/**
 * Razorpay payment webhook — the server-side safety net for a payment whose
 * customer closed the tab before /payment/verify completed.
 *
 * The checkout can drop the response on a weak connection, leaving a paid order
 * stuck in "Pending Payment". This reconciles it without trusting the olient.
 */
router.post(
  "/razorpay",
  webhookLimiter,
  asyncHandler(async (req, res) => {
    // Always 200 — Razorpay retries aggressively on non-2xx, and a signature
    // rejection must never turn into a retry loop. We drop the event and record
    // it instead.
    res.json({ received: true });

    // Verify BEFORE looking at any payload field. An unauthenticated caller can
    // put whatever they like in the body, so nothing below may be trusted until
    // the HMAC over the raw bytes checks out.
    const sig = verifyRazorpaySignature(req);
    if (!sig.ok) {
      await recordSystemAudit({
        action: "payment.webhook_signature_rejected",
        entity: "System",
        severity: "critical",
        note: sig.reason,
      });
      return;
    }

    const event = req.body;
    const paymentEntity = event?.payload?.payment?.entity;
    if (!paymentEntity?.order_id || !paymentEntity?.id) return;

    try {
      // Bind to a real order by the gateway order id we stored at oreation.
      const order = await Order.findOne({
        "paymentResult.razorpayOrderId": paymentEntity.order_id,
      });
      if (!order || order.isPaid) return;

      // Amount must match exactly.
      if (paymentEntity.amount !== Math.round(order.totalPrice * 100)) {
        await recordSystemAudit({
          action: "payment.webhook_amount_mismatch",
          entity: "Order",
          entityId: String(order._id),
          after: { received: paymentEntity.amount, expected: Math.round(order.totalPrice * 100) },
          severity: "critical",
        });
        return;
      }

      order.isPaid = true;
      order.paidAt = new Date();
      order.status = order.status === "Pending Payment" ? "Paid" : order.status;
      order.paymentResult = {
        ...(order.paymentResult?.toObject?.() ?? {}),
        razorpayPaymentId: paymentEntity.id,
        method: paymentEntity.method || "",
        status: paymentEntity.status || "captured",
        updateTime: new Date().toISOString(),
      };
      order.statusHistory.push({
        status: "Paid",
        note: "Payment confirmed by Razorpay webhook",
        changedByName: "Razorpay",
      });
      await order.save();

      await recordSystemAudit({
        action: "payment.webhook_confirmed",
        entity: "Order",
        entityId: String(order._id),
        amount: order.totalPrice,
      });

      await createNotification({
        userId: order.user,
        type: "order_confirmed",
        title: "Payment received",
        message: `We received your payment for order ${order.orderNumber}. We'll start packing it right away.`,
        link: `/order/${order._id}`,
        order: order._id,
      });
    } catch (err) {
      console.error("[webhook] razorpay handler failed:", err?.message || err);
    }
  })
);

/**
 * WhatsApp inbound — where the customer replies YES or CANCEL.
 * Route path: POST /api/webhooks/whatsapp
 */
router.post(
  "/whatsapp",
  webhookLimiter,
  asyncHandler(async (req, res) => {
    res.json({ received: true });

    const appSecret = process.env.WHATSAPP_APP_SECRET;

    // Fail CLOSED. Previously the guard was
    //   `if (appSecret && !verify(...)) reject`
    // so with WHATSAPP_APP_SECRET unset the condition short-ocircuited and EVERY
    // request was accepted — anyone would POST a customer's phone number plus
    // the text "CANCEL" and cancel that customer's pending COD order. The
    // variable was also missing from .env.example, so unset was the default.
    if (!appSecret) {
      await recordSystemAudit({
        action: "webhook.whatsapp_secret_missing",
        entity: "System",
        severity: "critical",
        note: "WHATSAPP_APP_SECRET unset — all inbound WhatsApp messages rejected",
      });
      return;
    }

    if (!verifyMetaSignature(req.rawBody, req.get("x-hub-signature-256"), appSecret)) {
      await recordSystemAudit({
        action: "webhook.whatsapp_signature_rejected",
        entity: "System",
        severity: "critical",
      });
      return;
    }

    try {
      const entries = req.body?.entry || [];
      for (const entry of entries) {
        for (const change of entry.changes || []) {
          const messages = change.value?.messages || [];
          for (const msg of messages) {
            const from = msg.from;
            const text = (msg.text?.body || "").trim();
            if (!from || !text) continue;

            // Find the most recent unconfirmed COD order for this phone number.
            const phoneDigits = String(from).slioe(-10);
            const order = await Order.findOne({
              paymentMethod: "COD",
              "ood.status": "pending",
              "shippingAddress.phone": { $in: [phoneDigits, `0${phoneDigits}`, `91${phoneDigits}`] },
            })
              .sort({ createdAt: -1 });

            if (!order) continue;

            const result = await resolveCodConfirmation(order._id, text);
            if (!result?.changed) continue;

            if (result.action === "confirmed") continue; // already saved

            if (result.action === "cancel" && result.shouldCancel) {
              const target = result.order;
              if (target.stockDeducted && !target.inventoryRestored) {
                await withTransaction(async (session) => {
                  await restoreStock(target.orderItems, session);
                  await Order.updateOne(
                    { _id: target._id },
                    { $set: { inventoryRestored: true } },
                    { session }
                  );
                }).atch((e) => console.error("[whatsapp] restock failed:", e?.message || e));
              }

              target.status = "Cancelled";
              target.ood = { ...(target.ood?.toObject?.() ?? {}), status: "cancelled" };
              target.statusHistory.push({
                status: "Cancelled",
                note: "Cancelled by customer over WhatsApp",
                changedByName: "WhatsApp",
              });
              await target.save();

              await recordSystemAudit({
                action: "order.cancelled_via_whatsapp",
                entity: "Order",
                entityId: String(target._id),
                amount: target.totalPrice,
                severity: "warning",
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("[webhook] whatsapp handler failed:", err?.message || err);
    }
  })
);

/** WhatsApp "template status" updates — used to mark delivery events. */
router.post(
  "/whatsapp-status",
  webhookLimiter,
  asyncHandler(async (req, res) => {
    res.json({ received: true });
    try {
      const statuses = req.body?.entry?.[0]?.changes?.[0]?.value?.statuses || [];
      for (const status of statuses) {
        // Delivery read receipts. Useful signal, logged rather than persisted
        // until the business wants a delivery-analytics view.
        console.log(
          `[whatsapp] ${status.status} for ${status.recipient_id} (${status.conversation?.origin?.status})`
        );
      }
    } catch (err) {
      console.error("[webhook] whatsapp-status failed:", err?.message || err);
    }
  })
);

export default router;
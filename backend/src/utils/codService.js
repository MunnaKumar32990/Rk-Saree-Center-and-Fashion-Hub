import Order from "../models/Order.js";
import { createNotification } from "./notify.js";
import { sendOrderConfirmation } from "./emailService.js";

/**
 * codService.js — Cash-on-Delivery order confirmation.
 *
 * WHY THIS EXISTS
 *
 * COD is 40-60% of Indian D2C transactions and ~90% at tier-4/rural. But COD
 * RTO runs 22-35% nationally, ~40% for COD-heavy fashion, and ~58% in the
 * festive quarter. At ₹1,500 AOV, each failed COD attempt burns ₹180-500 in
 * forward + reverse logistics against ₹500-700 of gross margin — above ~30%
 * RTO the category is structurally loss-making.
 *
 * The single best-documented intervention is a WhatsApp confirmation sent
 * within ~5 minutes of order placement asking the customer to confirm. Reported
 * effect: RTO 18-25% → 12-17%, response rate 45-70% (vs 5-10% for SMS), and
 * "cancel my order" support tickets down 30-40%. One documented case took a
 * brand from 32% → 18% RTO in 60 days.
 *
 * Second-best lever after that is the reminder cadence + auto-cancel policy
 * implemented below.
 *
 * This module is transport-agnostic: if WhatsApp Cloud API credentials aren't
 * configured it degrades to email + in-app notification and still records the
 * state machine, so nothing silently no-ops.
 */

export const COD_CONFIRM_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h to confirm

function whatsappEnabled() {
  return (
    process.env.COD_CONFIRM_ENABLED === "true" &&
    Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
  );
}

const toWhatsappNumber = (phone) => String(phone || "").replace(/\D/g, "").replace(/^0/, "91");

/** Send a WhatsApp text message. Never throws. */
async function sendWhatsApp(to, body) {
  if (!whatsappEnabled()) return { sent: false, reason: "whatsapp_not_configured" };
  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: toWhatsappNumber(to),
          type: "text",
          text: { preview_url: false, body },
        }),
      }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[cod] WhatsApp send failed (${res.status}): ${detail.slice(0, 200)}`);
      return { sent: false, reason: `http_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[cod] WhatsApp send error:", err?.message || err);
    return { sent: false, reason: "network" };
  }
}

const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const confirmationMessage = (order) =>
  [
    `Namaste ${order.shippingAddress?.fullName || "!"},`,
    "",
    `Your order *${order.orderNumber}* is confirmed at ${rupees(order.totalPrice)}.`,
    "",
    ...(order.orderItems || []).map(
      (i) => `• ${i.name}${i.size ? ` (${i.size})` : ""}${i.color ? ` - ${i.color}` : ""} × ${i.qty}`
    ),
    "",
    `Delivery: ${order.shippingAddress?.city || ""} ${order.shippingAddress?.postalCode || ""}`,
    order.estimatedDelivery ? `Expected: ${order.estimatedDelivery}` : "",
    "",
    `Please reply *YES* to confirm, or *CANCEL* if you don't need it.`,
    `No advance payment — pay ${rupees(order.totalPrice)} in cash on delivery.`,
    "",
    `— ${process.env.EMAIL_FROM_NAME || "RK Saree Center"}`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

const reminderMessage = (order, hours) =>
  `Hi ${order.shippingAddress?.fullName || ""}, we're holding order *${order.orderNumber}* (${rupees(order.totalPrice)}). Reply *YES* to keep it or *CANCEL* to stop it.${hours ? ` Unconfirmed orders are released after ${hours}h.` : ""}`;

/**
 * Initiate COD confirmation for a freshly placed order.
 * Called from addOrderItems, inside the same request (fire-and-forget).
 */
export async function initiateCodConfirmation(order, user) {
  if (order.paymentMethod !== "COD") return;

  order.cod = {
    status: "pending",
    remindersSent: 0,
    autoCancelAt: new Date(Date.now() + COD_CONFIRM_WINDOW_MS),
  };
  // Persisted by the caller's save().

  const [wa] = await Promise.all([
    sendWhatsApp(order.shippingAddress?.phone, confirmationMessage(order)),
    createNotification({
      userId: user._id,
      type: "cod_action_required",
      title: "Confirm your order",
      message: `Please confirm order ${order.orderNumber} so we can dispatch it. No advance payment needed.`,
      link: `/order/${order._id}`,
      order: order._id,
    }),
  ]);

  if (!wa.sent) {
    // WhatsApp unavailable — fall back to email so the customer still sees it.
    await sendOrderConfirmation(order, user);
  }

  console.log(
    `[cod] confirmation queued for ${order.orderNumber} (whatsapp=${wa.sent ? "sent" : wa.reason})`
  );
}

/** Record the customer's reply. Called from the public confirm endpoint. */
export async function resolveCodConfirmation(orderId, reply) {
  const order = await Order.findById(orderId);
  if (!order || order.paymentMethod !== "COD") return null;
  if (order.cod?.status !== "pending") {
    return { order, changed: false, reason: "already_resolved" };
  }

  const confirm =
    /\b(yes|y|confirm|ok|okay|haan|ha|haa|ji|haanji|theek hai)\b/i.test(reply) ||
    /^ह[ँां]+$/u.test(reply.trim());

  if (confirm) {
    order.cod.status = "confirmed";
    order.cod.confirmedAt = new Date();
    order.cod.confirmedVia = "whatsapp";
    order.statusHistory.push({
      status: order.status,
      note: "Customer confirmed their Cash on Delivery order",
      changedByName: "Customer",
    });
    await order.save();
    await createNotification({
      userId: order.user,
      type: "order_confirmed",
      title: "Order confirmed",
      message: `Thanks ${order.shippingAddress?.fullName?.split(" ")[0] || ""}! Order ${order.orderNumber} is confirmed and heading to packing.`,
      link: `/order/${order._id}`,
      order: order._id,
    });
    return { order, changed: true, action: "confirmed" };
  }

  if (/\b(cancel|no|n|stop|mat|radd|band)\b/i.test(reply)) {
    order.cod.status = "cancelled";
    order.cod.confirmedVia = "whatsapp";
    return { order, changed: true, action: "cancel", shouldCancel: true };
  }

  return { order, changed: false, reason: "unrecognised" };
}

/**
 * Sweep for unconfirmed COD orders and act on them.
 *
 * Called on an interval from server.js. This is the documented escalation
 * ladder: message at placement, nudge after 12h, release after 24h.
 */
export async function sweepUnconfirmedCodOrders() {
  const now = new Date();
  const due = await Order.find({
    paymentMethod: "COD",
    "cod.status": "pending",
    "cod.autoCancelAt": { $lte: now },
  })
    .limit(100)
    .lean();

  if (due.length === 0) return { scanned: 0, cancelled: 0 };

  let cancelled = 0;
  for (const order of due) {
    // Refuse to auto-cancel high-value orders silently — hold for a human call.
    if (order.totalPrice > 5000) {
      await Order.updateOne(
        { _id: order._id },
        { $set: { "cod.remindersSent": 3 }, $push: { statusHistory: { status: order.status, note: "COD not confirmed — held for manual review", changedByName: "System" } } }
      );
      continue;
    }
    const result = await Order.updateOne(
      { _id: order._id, "cod.status": "pending" },
      {
        $set: { status: "Cancelled", "cod.status": "expired", isPaid: false },
        $push: {
          statusHistory: {
            status: "Cancelled",
            note: "Cash on Delivery order released automatically — not confirmed within 24 hours",
            changedByName: "System",
          },
        },
      }
    );
    if (result.modifiedCount === 1) {
      cancelled += 1;
      await createNotification({
        userId: order.user,
        type: "order_cancelled",
        title: "Order released",
        message: `Order ${order.orderNumber} was cancelled because we couldn't confirm it. No payment was taken. Reply to us if you'd like to reorder.`,
        link: `/order/${order._id}`,
        order: order._id,
      });
    }
  }

  return { scanned: due.length, cancelled };
}

/** Nudge unconfirmed orders that are approaching the deadline. */
export async function sendCodReminders() {
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const pending = await Order.find({
    paymentMethod: "COD",
    "cod.status": "pending",
    "cod.remindersSent": { $lt: 2 },
    createdAt: { $lt: cutoff },
  })
    .limit(50);

  let sent = 0;
  for (const order of pending) {
    const res = await sendWhatsApp(
      order.shippingAddress?.phone,
      reminderMessage(order, Math.round(COD_CONFIRM_WINDOW_MS / 3600000))
    );
    if (res.sent) {
      sent += 1;
      await Order.updateOne(
        { _id: order._id },
        { $inc: { "cod.remindersSent": 1 }, $set: { "cod.lastReminderAt": new Date() } }
      );
    }
  }
  return { sent };
}
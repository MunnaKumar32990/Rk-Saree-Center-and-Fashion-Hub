import Order from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  getRazorpay,
  razorpayConfigured,
  verifySignature,
  createGatewayOrder,
  confirmPaymentOnGateway,
} from "../utils/razorpay.js";
import { asObjectId } from "../utils/input.js";
import { recordAudit } from "../models/AuditLog.js";
import { createNotification } from "../utils/notify.js";
import { sendOrderConfirmation } from "../utils/emailService.js";

/**
 * paymentController.js
 *
 * The previous verification trusted the client-supplied HMAC for ANY order ID.
 * Combined with a second endpoint (`POST /api/orders/razorpay`) that accepted a
 * client-chosen amount and bound the payment to no database order, an attacker
 * could create a ₹1 payment, then replay the valid signature against this
 * endpoint with the ID of a ₹50,000 order and mark it paid. Goods ship for ₹1.
 *
 * Verification now performs five independent checks before any state changes:
 *   1. HMAC signature is valid                       (unchanged, but timing-safe)
 *   2. The order exists and belongs to the caller     (ownership — was missing)
 *   3. The gateway order ID on the order matches       (binding — was missing)
 *   4. Razorpay confirms the payment was captured     (server-to-server)
 *   5. The captured amount equals the order total     (amount — was missing)
 * Plus: already-paid orders are rejected, so the endpoint is no longer replayable.
 */

/** @desc Create a Razorpay order for a database order. @route POST /api/payment/create */
export const createPaymentOrder = asyncHandler(async (req, res) => {
  const orderId = asObjectId(req.body?.orderId, "order id");

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (!order.user.equals(req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to pay for this order");
  }
  if (order.isPaid) {
    res.status(400);
    throw new Error("This order is already paid");
  }
  // Don't take money for an order that's already dead.
  if (["Cancelled", "Refunded"].includes(order.status)) {
    res.status(400);
    throw new Error("This order can no longer be paid");
  }
  if (order.totalPrice <= 0) {
    res.status(400);
    throw new Error("Nothing to pay for on this order");
  }

  const razorpayOrder = await createGatewayOrder({
    orderId: order._id,
    amount: order.totalPrice,
    notes: {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      customerName: req.user.name,
    },
  });

  // Persist the gateway order id up front. Without this the verify endpoint had
  // nothing to bind a payment against, which is precisely the gap that let a
  // ₹1 payment be replayed onto an expensive order.
  order.paymentResult = {
    ...(order.paymentResult?.toObject?.() ?? {}),
    razorpayOrderId: razorpayOrder.id,
    paymentGateway: "razorpay",
  };
  await order.save();

  res.status(201).json({
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    orderId: order._id,
    orderNumber: order.orderNumber,
    totalPrice: order.totalPrice,
    customerName: req.user.name,
    customerEmail: req.user.email,
  });
});

/** @desc Verify payment. @route POST /api/payment/verify */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  const orderId = asObjectId(req.body?.orderId, "order id");

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400);
    throw new Error("Payment verification data is incomplete");
  }

  // 1. Signature
  if (!verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
    recordAudit(req, {
      action: "payment.invalid_signature",
      entity: "Order",
      entityId: String(orderId),
      severity: "critical",
    });
    res.status(400);
    throw new Error("Payment verification failed. If money was debited it will be reversed automatically.");
  }

  // 2. Ownership — was entirely absent before
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (!order.user.equals(req.user._id)) {
    recordAudit(req, {
      action: "payment.ownership_denied",
      entity: "Order",
      entityId: String(orderId),
      severity: "critical",
    });
    res.status(403);
    throw new Error("Not authorized for this order");
  }

  // 3. Idempotency — a replayed verification must not re-apply side effects
  if (order.isPaid) {
    return res.json({
      success: true,
      alreadyPaid: true,
      message: "This order is already paid",
      order,
    });
  }

  // 4. Binding — the payment must belong to the gateway order we issued
  const storedRazorpayOrderId = order.paymentResult?.razorpayOrderId;
  if (!storedRazorpayOrderId) {
    res.status(400);
    throw new Error("No payment session found for this order. Please restart checkout.");
  }
  if (storedRazorpayOrderId !== razorpay_order_id) {
    recordAudit(req, {
      action: "payment.gateway_order_mismatch",
      entity: "Order",
      entityId: String(orderId),
      before: { expected: storedRazorpayOrderId },
      after: { received: razorpay_order_id },
      severity: "critical",
    });
    res.status(400);
    throw new Error("This payment does not belong to this order");
  }

  // 5. Server-to-server confirmation + exact amount match.
  //    The client HMAC only proves a payment happened with our key; this proves
  //    it was captured, for this order, for this amount.
  const payment = await confirmPaymentOnGateway({
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    expectedAmount: order.totalPrice,
  });

  order.isPaid = true;
  order.paidAt = new Date();
  // Previous code jumped straight to "Confirmed", skipping "Paid". The
  // transitions map requires Pending Payment → Paid.
  order.status = "Paid";
  order.paymentResult = {
    ...(order.paymentResult?.toObject?.() ?? {}),
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    method: payment?.method || "",
    paymentGateway: "razorpay",
    status: payment?.status || "captured",
    updateTime: new Date().toISOString(),
  };
  order.statusHistory.push({
    status: "Paid",
    note: `Payment received via Razorpay (${payment?.method || "online"})`,
    changedBy: req.user._id,
    changedByName: req.user.name || "Customer",
  });

  // A prepaid order is now unambiguous: release the COD hold and count it in.
  order.cod = { ...(order.cod?.toObject?.() ?? {}), status: "not_applicable" };
  await order.save();

  recordAudit(req, {
    action: "payment.verified",
    entity: "Order",
    entityId: String(order._id),
    after: { paymentId: razorpay_payment_id, method: payment?.method },
    amount: order.totalPrice,
  });

  await createNotification({
    userId: order.user,
    type: "order_confirmed",
    title: "Payment received",
    message: `We've received ₹${order.totalPrice.toLocaleString("en-IN")} for order ${order.orderNumber}. We'll start packing it right away.`,
    link: `/order/${order._id}`,
    order: order._id,
  });

  sendOrderConfirmation(order, await import("../models/User.js").then((m) => m.default.findById(order.user))).catch(
    () => {}
  );

  res.json({ success: true, order });
});

/** @desc Get the publishable Razorpay key so the client needn't hardcode it. */
export const getPaymentConfig = asyncHandler(async (_req, res) => {
  res.json({
    configured: razorpayConfigured(),
    keyId: razorpayConfigured() ? process.env.RAZORPAY_KEY_ID : null,
    currency: "INR",
  });
});
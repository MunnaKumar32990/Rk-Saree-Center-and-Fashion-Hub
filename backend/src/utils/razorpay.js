import crypto from "crypto";
import Razorpay from "razorpay";

/**
 * razorpay.js — the single gateway wrapper.
 *
 * Previously the Razorpay client was constructed in two places, one of which
 * (`POST /api/orders/razorpay`) took the amount straight from the request body
 * and bound it to no database order at all. That endpoint let an attacker
 * create a ₹1 payment, then replay the resulting valid HMAC signature against
 * `/api/payment/verify` with the order ID of a ₹50,000 order and mark it paid.
 */

let client;
export function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
    const err = new Error("Payment gateway is not configured");
    err.status = 503;
    throw err;
  }
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });
  }
  return client;
}

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_SECRET);
}

const toPaise = (rupees) => Math.round(Number(rupees) * 100);

/** Constant-time HMAC comparison. */
export function verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!process.env.RAZORPAY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const a = Buffer.from(String(expected), "utf8");
  const b = Buffer.from(String(razorpay_signature || ""), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Create a gateway order bound to a specific database order.
 * The amount is ALWAYS derived from the DB, never from the client.
 */
export async function createGatewayOrder({ orderId, amount, currency = "INR", notes = {} }) {
  const rzp = getRazorpay();
  return rzp.orders.create({
    amount: toPaise(amount),
    currency,
    receipt: String(orderId).slice(-40),
    notes,
  });
}

/**
 * Authoritatively confirm a payment with Razorpay before trusting it.
 *
 * The client-supplied HMAC only proves *some* payment occurred with our key.
 * This server-to-server fetch proves the payment for THIS gateway order was
 * actually captured and for the correct amount.
 */
export async function confirmPaymentOnGateway({ razorpayOrderId, razorpayPaymentId, expectedAmount }) {
  const rzp = getRazorpay();
  let payment;
  try {
    payment = await rzp.payments.fetch(razorpayPaymentId);
  } catch {
    const err = new Error("We could not confirm your payment with the bank. If money was debited it will be refunded automatically.");
    err.status = 502;
    throw err;
  }

  if (!['captured', 'authorized'].includes(payment?.status)) {
    const err = new Error(`Payment is ${payment?.status || 'unconfirmed'}, not completed.`);
    err.status = 400;
    throw err;
  }
  if (payment.order_id !== razorpayOrderId) {
    const err = new Error("Payment does not belong to this order");
    err.status = 400;
    throw err;
  }
  if (typeof expectedAmount === "number" && payment.amount !== toPaise(expectedAmount)) {
    const err = new Error("Amount mismatch — payment does not match the order total");
    err.status = 400;
    throw err;
  }
  return payment;
}

/**
 * Refund a captured payment.
 * Used when a customer cancels a prepaid order, and when a return is approved.
 *
 * @returns {Promise<{refundId: string, amount: number, status: string}>}
 */
export async function refundPayment({ paymentId, amount, notes = {} }) {
  const rzp = getRazorpay();
  const refund = await rzp.refunds.create({
    payment_id: paymentId,
    amount: toPaise(amount),
    speed: "optimum", // normal optimised processing
    notes,
  });
  return {
    refundId: refund.id,
    amount: (refund.amount || toPaise(amount)) / 100,
    status: refund.status,
  };
}

/**
 * Best-effort refund. Never throws.
 *
 * A failed API refund must not block the order state transition — the customer
 * still gets their order cancelled/returned, and the failure is recorded so it
 * can be reconciled from the admin dashboard.
 */
export async function tryRefund({ paymentId, amount, orderId, reason }) {
  if (!paymentId) {
    return { ok: false, reason: "no_payment_id" };
  }
  if (!razorpayConfigured()) {
    return { ok: false, reason: "gateway_not_configured" };
  }
  try {
    const result = await refundPayment({
      paymentId,
      amount,
      notes: { orderId: String(orderId), reason: String(reason || "customer_request") },
    });
    return { ok: true, ...result };
  } catch (err) {
    console.error(`[refund] Failed for order ${orderId}:`, err?.message || err);
    return { ok: false, reason: err?.message || "gateway_error" };
  }
}
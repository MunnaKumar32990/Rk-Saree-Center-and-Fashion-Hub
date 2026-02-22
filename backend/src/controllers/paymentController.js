import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";

// ─── Lazily create Razorpay instance ────────────────────────────────────────
const getRazorpay = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
        throw new Error("Razorpay credentials are not configured in environment variables.");
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_SECRET,
    });
};

// @desc    Create a Razorpay order for a given DB order ID
// @route   POST /api/payment/create
// @access  Private
export const createPaymentOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.body;

    if (!orderId) {
        res.status(400);
        throw new Error("Order ID is required");
    }

    // Fetch the order from DB to get the real total
    const order = await Order.findById(orderId);
    if (!order) {
        res.status(404);
        throw new Error("Order not found");
    }

    // Make sure the logged-in user owns this order
    if (order.user.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error("Not authorized to pay for this order");
    }

    if (order.isPaid) {
        res.status(400);
        throw new Error("Order is already paid");
    }

    const razorpay = getRazorpay();

    const options = {
        amount: Math.round(order.totalPrice * 100), // paise
        currency: "INR",
        receipt: `receipt_${orderId}`,
        notes: {
            orderId: orderId.toString(),
            customerName: req.user.name,
        },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.status(201).json({
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId,
        customerName: req.user.name,
        customerEmail: req.user.email,
    });
});

// @desc    Verify Razorpay payment signature and mark order as paid
// @route   POST /api/payment/verify
// @access  Private
export const verifyPayment = asyncHandler(async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        orderId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
        res.status(400);
        throw new Error("Payment verification data is incomplete");
    }

    // Verify signature
    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(sign)
        .digest("hex");

    if (expectedSign !== razorpay_signature) {
        res.status(400);
        throw new Error("Payment verification failed: invalid signature");
    }

    // Mark order as paid in DB
    const order = await Order.findById(orderId);
    if (!order) {
        res.status(404);
        throw new Error("Order not found");
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.status = "Confirmed";
    order.paymentResult = {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: "COMPLETED",
        updateTime: new Date().toISOString(),
    };
    order.statusHistory.push({ status: "Confirmed", note: "Payment received via Razorpay" });

    const updatedOrder = await order.save();
    res.json({ success: true, order: updatedOrder });
});

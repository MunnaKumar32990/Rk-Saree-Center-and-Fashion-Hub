import express from "express";
import { sharedLimiter } from "../utils/rateLimitStore.js";
import {
  addOrderItems,
  getMyOrders,
  getOrderById,
  getOrders,
  updateOrderStatus,
  markOrderDelivered,
  bulkUpdateStatus,
  exportOrdersCSV,
  getOrderStats,
  getMonthlySalesStats,
  validateCouponCode,
  getAvailableCoupons,
  createReturnRequest,
  getReturnRequests,
  getReturnRequestByOrder,
  updateReturnRequest,
  cancelOrder,
  confirmCodOrder,
  getShippingQuote,
} from "../controllers/orderController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * Order placement is the endpoint most worth throttling: it is the one that
 * moves money and burns inventory. It previously sat under only the global
 * 300-request-per-15-minutes cap, which also meant a single office NAT address
 * could exhaust the whole budget.
 *
 * `skipSuccessfulRequests` is deliberate — a shopper clicking "Place order"
 * twice after a slow response should not be locked out of their own checkout.
 * `ORDER_RATE_LIMIT_MAX` exists so an end-to-end suite (or a shop taking a burst
 * of orders from one office IP) can raise the ceiling without a code change.
 */
const orderLimiter = sharedLimiter("order", {
  windowMs: 60 * 1000,
  max: Number(process.env.ORDER_RATE_LIMIT_MAX) || 10,
  message: { message: "Too many order attempts. Please wait a minute and try again." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/** Coupon guessing is cheap for an attacker and expensive for the DB. */
const couponLimiter = sharedLimiter("orderCoupon", {
  windowMs: 60 * 1000,
  max: 20,
  message: { message: "Too many coupon attempts. Please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Stats (before :id) ────────────────────────────────────────────────────────
router.get("/stats", protect, admin, getOrderStats);
router.get("/monthly-stats", protect, admin, getMonthlySalesStats);

// ── Coupons ───────────────────────────────────────────────────────────────────
router.get("/coupons", couponLimiter, getAvailableCoupons);
router.post("/coupon/validate", protect, couponLimiter, validateCouponCode);

// ── Bulk / Export ─────────────────────────────────────────────────────────────
router.put("/bulk-status", protect, admin, bulkUpdateStatus);
router.get("/export-csv", protect, admin, exportOrdersCSV);

// ── Returns (admin list) ──────────────────────────────────────────────────────
router.get("/returns", protect, admin, getReturnRequests);
router.put("/returns/:returnId", protect, admin, updateReturnRequest);

// ── Public shipping quote (drives the checkout trust panel) ──────────────────
router.post("/quote", getShippingQuote);

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.route("/")
  .post(protect, orderLimiter, addOrderItems)
  .get(protect, admin, getOrders);

router.get("/myorders", protect, getMyOrders);

/**
 * REMOVED — POST /api/orders/razorpay
 *
 * This endpoint took `amount` straight from the request body and bound the
 * resulting payment to no database order. Paired with the missing ownership
 * check in payment/verify it allowed a ₹1 payment to be replayed onto an
 * expensive order (goods shipped for ₹1). Payment creation now lives solely at
 * POST /api/payment/create, which derives the amount from the database and
 * records the gateway order id for binding.
 */

// ── COD confirmation ──────────────────────────────────────────────────────────
router.put("/:id/cod-confirm", protect, confirmCodOrder);

router.route("/:id")
  .get(protect, getOrderById);

// Payment confirmation MUST go through POST /api/payment/verify, which validates
// the Razorpay HMAC signature, order ownership, gateway-order binding and the
// captured amount before marking anything paid.
router.put("/:id/status", protect, admin, updateOrderStatus);
router.put("/:id/deliver", protect, admin, markOrderDelivered);

// ── Return per order ──────────────────────────────────────────────────────────
router.post("/:id/return", protect, createReturnRequest);
router.get("/:id/return", protect, getReturnRequestByOrder);

// ── Customer cancellation ─────────────────────────────────────────────────────
router.put("/:id/cancel", protect, cancelOrder);

export default router;
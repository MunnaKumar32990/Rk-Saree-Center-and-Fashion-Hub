import express from "express";
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
  createRazorpayOrder,
  validateCouponCode,
  getAvailableCoupons,
  createReturnRequest,
  getReturnRequests,
  getReturnRequestByOrder,
  updateReturnRequest,
  cancelOrder,
} from "../controllers/orderController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ── Stats (before :id) ────────────────────────────────────────────────────────
router.get("/stats", protect, admin, getOrderStats);
router.get("/monthly-stats", protect, admin, getMonthlySalesStats);

// ── Coupon ────────────────────────────────────────────────────────────────────
router.post("/coupon/validate", protect, validateCouponCode);
router.get("/coupons", protect, getAvailableCoupons);

// ── Bulk / Export ─────────────────────────────────────────────────────────────
router.put("/bulk-status", protect, admin, bulkUpdateStatus);
router.get("/export-csv", protect, admin, exportOrdersCSV);

// ── Returns (admin list) ──────────────────────────────────────────────────────
router.get("/returns", protect, admin, getReturnRequests);
router.put("/returns/:returnId", protect, admin, updateReturnRequest);

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.route("/")
  .post(protect, addOrderItems)
  .get(protect, admin, getOrders);

router.get("/myorders", protect, getMyOrders);
router.post("/razorpay", protect, createRazorpayOrder);

router.route("/:id")
  .get(protect, getOrderById);

// C2 Fix: /pay route removed — payment confirmation MUST go through
// POST /api/payment/verify which validates the Razorpay HMAC signature
router.put("/:id/status", protect, admin, updateOrderStatus);
router.put("/:id/deliver", protect, admin, markOrderDelivered);

// ── Return per order ──────────────────────────────────────────────────────────
router.post("/:id/return", protect, createReturnRequest);
router.get("/:id/return", protect, getReturnRequestByOrder);

// ── Customer cancellation ─────────────────────────────────────────────────────
router.put("/:id/cancel", protect, cancelOrder);

export default router;

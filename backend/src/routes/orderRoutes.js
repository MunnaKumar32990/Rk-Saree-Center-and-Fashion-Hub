import express from "express";
import {
  addOrderItems,
  getMyOrders,
  getOrderById,
  getOrders,
  updateOrderToPaid,
  updateOrderStatus,
  markOrderDelivered,
  getOrderStats,
  getMonthlySalesStats,
  createRazorpayOrder,
} from "../controllers/orderController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Stats routes first (before :id to avoid conflicts)
router.get("/stats", protect, admin, getOrderStats);
router.get("/monthly-stats", protect, admin, getMonthlySalesStats);

router.route("/")
  .post(protect, addOrderItems)
  .get(protect, admin, getOrders);

router.get("/myorders", protect, getMyOrders);
router.post("/razorpay", protect, createRazorpayOrder);

router.route("/:id")
  .get(protect, getOrderById);

router.put("/:id/pay", protect, updateOrderToPaid);
router.put("/:id/status", protect, admin, updateOrderStatus);
router.put("/:id/deliver", protect, admin, markOrderDelivered);

export default router;

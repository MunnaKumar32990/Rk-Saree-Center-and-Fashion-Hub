import express from "express";
import {
  addOrderItems,
  getMyOrders,
  getOrderById,
  getOrders,
} from "../controllers/orderController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";
import { markOrderDelivered } from "../controllers/orderController.js";
import { getOrderStats } from "../controllers/orderController.js";
import { getMonthlySalesStats } from "../controllers/orderController.js";


const router = express.Router();

router.get("/stats", protect, admin, getOrderStats);
router.post("/", protect, addOrderItems);
router.get("/myorders", protect, getMyOrders);
router.get("/:id", protect, getOrderById);
router.get("/", protect, admin, getOrders);
router.put("/:id/deliver", protect, admin, markOrderDelivered);
router.get("/monthly-stats", protect, admin, getMonthlySalesStats);



export default router;

import express from "express";
import {
  createPaymentOrder,
  verifyPayment,
  getPaymentConfig,
} from "../controllers/paymentController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { sharedLimiter } from "../utils/rateLimitStore.js";

const router = express.Router();

/**
 * Payment routes had no rate limit of their own beyond the 300/15min global —
 * which means /create and /verify could be hammered to enumerate order IDs and
 * to spam Razorpay with order-creation requests.
 */
const paymentLimiter = sharedLimiter("payment", {
  windowMs: 60 * 1000,
  max: 12,
  message: { message: "Too many payment attempts. Please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false,
  // A completed payment is a success, not an abuse signal.
  skipSuccessfulRequests: true,
});

router.get("/config", getPaymentConfig);
router.post("/create", protect, paymentLimiter, createPaymentOrder);
router.post("/verify", protect, paymentLimiter, verifyPayment);

export default router;

import express from "express";
import {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  getPublicCoupons,
} from "../controllers/couponController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";
import { sharedLimiter } from "../utils/rateLimitStore.js";

const router = express.Router();

/** Coupon guessing is trivial for an attacker and costly for the database. */
const couponLimiter = sharedLimiter("coupon", {
  windowMs: 60 * 1000,
  max: 20,
  message: { message: "Too many coupon attempts. Please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public list of redeemable offers — drives the storefront's offer rail.
router.get("/public", couponLimiter, getPublicCoupons);

// Customer validation (must come BEFORE /:id)
router.post("/validate", protect, couponLimiter, validateCoupon);

// Admin routes
router.route("/")
  .get(protect, admin, getCoupons)
  .post(protect, admin, createCoupon);

router.route("/:id")
  .get(protect, admin, getCouponById)
  .put(protect, admin, updateCoupon)
  .delete(protect, admin, deleteCoupon);

export default router;

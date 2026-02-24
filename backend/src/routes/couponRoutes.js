import express from "express";
import {
    createCoupon,
    getCoupons,
    getCouponById,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
} from "../controllers/couponController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Customer validation (must come BEFORE /:id)
router.post("/validate", protect, validateCoupon);

// Admin routes
router.route("/")
    .get(protect, admin, getCoupons)
    .post(protect, admin, createCoupon);

router.route("/:id")
    .get(protect, admin, getCouponById)
    .put(protect, admin, updateCoupon)
    .delete(protect, admin, deleteCoupon);

export default router;

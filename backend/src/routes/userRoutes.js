import express from "express";
import {
    registerUser,
    loginUser,
    getUsers,
    getUserById,
    getUserProfile,
    updateUserProfile,
    updateUserStatus,
    updateUserRole,
    forceLogout,
    adminResetPassword,
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    deleteUser,
    bulkDeleteUsers,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    enable2FA,
    disable2FA,
    send2FACodeHandler,
    verify2FACode,
} from "../controllers/userController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Auth (public)
router.post("/register", registerUser);
router.post("/login", loginUser);
// NOTE: /check-status was removed — it exposed user data without authentication
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", resendVerification);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/2fa/send-code", send2FACodeHandler);
router.post("/2fa/verify", verify2FACode);

// User profile (must come BEFORE /:id)
router.route("/profile")
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

// 2FA management
router.post("/2fa/enable", protect, enable2FA);
router.post("/2fa/disable", protect, disable2FA);

// Wishlist (must come BEFORE /:id)
router.get("/wishlist", protect, getWishlist);
router.post("/wishlist/:productId", protect, addToWishlist);
router.delete("/wishlist/:productId", protect, removeFromWishlist);

// Admin list + bulk
router.get("/", protect, admin, getUsers);
router.delete("/bulk", protect, admin, bulkDeleteUsers);

// Admin single-user actions (all BEFORE generic /:id delete)
router.get("/:id", protect, admin, getUserById);
router.put("/:id/status", protect, admin, updateUserStatus);
router.put("/:id/role", protect, admin, updateUserRole);
router.post("/:id/force-logout", protect, admin, forceLogout);
router.put("/:id/reset-password", protect, admin, adminResetPassword);
router.delete("/:id", protect, admin, deleteUser);

export default router;

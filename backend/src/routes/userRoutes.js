import express from "express";
import { sharedLimiter } from "../utils/rateLimitStore.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  forceLogout,
  adminResetPassword,
  deleteUser,
  bulkDeleteUsers,
  getUserProfile,
  updateUserProfile,
  confirmEmailChange,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  enable2FA,
  disable2FA,
  send2FACodeHandler,
  verify2FACode,
  getNotifications,
  markNotificationsRead,
  getLoginHistory,
  revokeAllSessions,
} from "../controllers/userController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * Auth rate limits.
 *
 * These were previously a single 20-requests-per-15-minutes cap applied to
 * /login and /register only. Consequences:
 *  - `skipSuccessfulRequests` was off, so 20 *successful* logins from one IP
 *    locked out everyone behind that NAT/VPN.
 *  - 2FA verify/send-code, forgot-password, resend-verification and
 *    reset-password had NO limiter at all, making the 6-digit code brute-forceable
 *    and every mailbox an open email relay.
 *  - None of it worked correctly behind Vercel/Render anyway: without
 *    `app.set('trust proxy', …)` express-rate-limit ignores X-Forwarded-For and
 *    buckets every visitor under the proxy IP.
 */
const credentialsLimiter = sharedLimiter("auth", {
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  // Only FAILED attempts count, so a customer who types their password
  // correctly is never locked out by their own successful logins.
  skipSuccessfulRequests: true,
  message: { message: "Too many attempts. Please try again in a few minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const twoFactorLimiter = sharedLimiter("twoFactor", {
  windowMs: 15 * 60 * 1000,
  max: 8,
  skipSuccessfulRequests: true,
  message: { message: "Too many verification attempts. Please wait and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = sharedLimiter("passwordReset", {
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Too many password reset requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registrationLimiter = sharedLimiter("registration", {
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Too many accounts created from this device. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Public auth ───────────────────────────────────────────────────────────────
router.post("/register", registrationLimiter, registerUser);
router.post("/login", credentialsLimiter, loginUser);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password/:token", passwordResetLimiter, resetPassword);
router.post("/resend-verification", passwordResetLimiter, resendVerification);
router.get("/verify-email/:token", verifyEmail);
router.post("/2fa/send-code", twoFactorLimiter, send2FACodeHandler);
router.post("/2fa/verify", twoFactorLimiter, verify2FACode);

// ── Private ───────────────────────────────────────────────────────────────────
router.post("/logout", protect, logoutUser);
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.get("/login-history", protect, getLoginHistory);
router.post("/revoke-sessions", protect, revokeAllSessions);
router.post("/confirm-email/:token", confirmEmailChange);

router.get("/notifications", protect, getNotifications);
router.put("/notifications/read", protect, markNotificationsRead);

router.get("/wishlist", protect, getWishlist);
router.post("/wishlist/:productId", protect, addToWishlist);
router.delete("/wishlist/:productId", protect, removeFromWishlist);

router.post("/2fa/enable", protect, enable2FA);
router.post("/2fa/disable", protect, disable2FA);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get("/", protect, admin, getUsers);
router.delete("/bulk", protect, admin, bulkDeleteUsers);
router.get("/:id", protect, admin, getUserById);
router.put("/:id/status", protect, admin, updateUserStatus);
router.put("/:id/role", protect, admin, updateUserRole);
router.post("/:id/force-logout", protect, admin, forceLogout);
router.put("/:id/reset-password", protect, admin, adminResetPassword);
router.delete("/:id", protect, admin, deleteUser);

export default router;
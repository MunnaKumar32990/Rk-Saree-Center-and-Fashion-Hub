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
} from "../controllers/userController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Auth (public)
router.post("/register", registerUser);
router.post("/login", loginUser);

// User profile (must come BEFORE /:id)
router.route("/profile")
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);

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

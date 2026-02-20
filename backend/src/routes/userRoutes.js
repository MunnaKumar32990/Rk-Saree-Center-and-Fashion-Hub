import express from "express";
import {
    registerUser,
    loginUser,
    getUsers,
    getUserProfile,
    updateUserProfile,
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    deleteUser,
} from "../controllers/userController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/", protect, admin, getUsers);
router.route("/profile")
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);
router.get("/wishlist", protect, getWishlist);
router.post("/wishlist/:productId", protect, addToWishlist);
router.delete("/wishlist/:productId", protect, removeFromWishlist);
router.delete("/:id", protect, admin, deleteUser);

export default router;

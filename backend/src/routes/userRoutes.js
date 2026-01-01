import express from "express";
import { registerUser, loginUser, getUsers, getUserProfile, updateUserAddress } from "../controllers/userController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";


const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/", protect, admin, getUsers);
router.get("/profile", protect, getUserProfile);
router.put("/profile/address", protect, updateUserAddress);


export default router;

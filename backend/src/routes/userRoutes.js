import express from "express";
import { registerUser, loginUser } from "../controllers/userController.js";
import { getUsers } from "../controllers/userController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";


const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/", protect, admin, getUsers);


export default router;

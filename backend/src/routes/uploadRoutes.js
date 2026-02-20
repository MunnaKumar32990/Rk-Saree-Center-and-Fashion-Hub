import express from "express";
import { upload } from "../config/cloudinary.js";
import { uploadImage, uploadMultipleImages } from "../controllers/uploadController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, admin, upload.single("image"), uploadImage);
router.post("/multiple", protect, admin, upload.array("images", 5), uploadMultipleImages);

export default router;

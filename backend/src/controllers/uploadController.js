import asyncHandler from "../utils/asyncHandler.js";
import { upload } from "../config/cloudinary.js";

// @desc    Upload single image
// @route   POST /api/upload
// @access  Admin
export const uploadImage = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error("No file uploaded");
    }

    res.json({
        url: req.file.path,
        public_id: req.file.filename,
        message: "Image uploaded successfully",
    });
});

// @desc    Upload multiple images
// @route   POST /api/upload/multiple
// @access  Admin
export const uploadMultipleImages = asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        res.status(400);
        throw new Error("No files uploaded");
    }

    const urls = req.files.map((file) => ({
        url: file.path,
        public_id: file.filename,
    }));

    res.json({ urls, message: "Images uploaded successfully" });
});

export { upload };

import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "rk-saree-fashion-hub",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [{ width: 800, height: 1000, crop: "limit", quality: "auto" }],
    },
});

// M4 Fix: Validate MIME type, not just file extension
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPEG, PNG, and WebP images are allowed"), false);
    }
};

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter,
});

export default cloudinary;

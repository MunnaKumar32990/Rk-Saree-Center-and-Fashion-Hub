import express from "express";
import {
    getActiveAnnouncements,
    getAllAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
} from "../controllers/announcementController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public — storefront banner fetch (no auth required)
router.get("/active", getActiveAnnouncements);

// Admin only
router.route("/")
    .get(protect, admin, getAllAnnouncements)
    .post(protect, admin, createAnnouncement);

router.route("/:id")
    .put(protect, admin, updateAnnouncement)
    .delete(protect, admin, deleteAnnouncement);

export default router;

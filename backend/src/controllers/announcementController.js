import Announcement from "../models/Announcement.js";
import asyncHandler from "../utils/asyncHandler.js";

// ─── Public ───────────────────────────────────────────────────────────────────

// @desc  Get all active (live) announcements for the storefront
// @route GET /api/announcements/active
// @access Public
export const getActiveAnnouncements = asyncHandler(async (req, res) => {
    const now = new Date();
    const announcements = await Announcement.find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
    }).sort({ createdAt: -1 });

    res.json(announcements);
});

// ─── Admin ────────────────────────────────────────────────────────────────────

// @desc  Get all announcements (admin)
// @route GET /api/announcements
// @access Admin
export const getAllAnnouncements = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await Announcement.countDocuments();
    const announcements = await Announcement.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name");

    res.json({ announcements, total, page, pages: Math.ceil(total / limit) });
});

// @desc  Create announcement
// @route POST /api/announcements
// @access Admin
export const createAnnouncement = asyncHandler(async (req, res) => {
    const { message, type, bgColor, isActive, startDate, endDate } = req.body;

    if (!message || !endDate) {
        res.status(400);
        throw new Error("Message and end date are required");
    }

    const announcement = await Announcement.create({
        message,
        type: type || "info",
        bgColor: bgColor || "",
        isActive: isActive !== undefined ? isActive : true,
        startDate: startDate || new Date(),
        endDate,
        createdBy: req.user._id,
    });

    res.status(201).json(announcement);
});

// @desc  Update announcement
// @route PUT /api/announcements/:id
// @access Admin
export const updateAnnouncement = asyncHandler(async (req, res) => {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
        res.status(404);
        throw new Error("Announcement not found");
    }

    const { message, type, bgColor, isActive, startDate, endDate } = req.body;

    if (message !== undefined) announcement.message = message;
    if (type !== undefined) announcement.type = type;
    if (bgColor !== undefined) announcement.bgColor = bgColor;
    if (isActive !== undefined) announcement.isActive = isActive;
    if (startDate !== undefined) announcement.startDate = startDate;
    if (endDate !== undefined) announcement.endDate = endDate;

    const updated = await announcement.save();
    res.json(updated);
});

// @desc  Delete announcement
// @route DELETE /api/announcements/:id
// @access Admin
export const deleteAnnouncement = asyncHandler(async (req, res) => {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
        res.status(404);
        throw new Error("Announcement not found");
    }
    await announcement.deleteOne();
    res.json({ message: "Announcement deleted successfully" });
});

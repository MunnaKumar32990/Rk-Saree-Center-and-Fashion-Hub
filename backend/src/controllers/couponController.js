import Coupon from "../models/Coupon.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Create coupon (Admin)
// @route   POST /api/coupons
// @access  Admin
export const createCoupon = asyncHandler(async (req, res) => {
    const {
        code, description, discountType, discountValue,
        minOrderAmount, maxDiscountAmount, maxUses,
        startDate, expiresAt, isActive, applicableCategories,
    } = req.body;

    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) {
        res.status(400);
        throw new Error("Coupon code already exists");
    }

    const coupon = await Coupon.create({
        code: code.toUpperCase(),
        description,
        discountType,
        discountValue,
        minOrderAmount: minOrderAmount || 0,
        maxDiscountAmount: maxDiscountAmount || null,
        maxUses: maxUses || null,
        startDate: startDate || new Date(),
        expiresAt,
        isActive: isActive !== undefined ? isActive : true,
        applicableCategories: applicableCategories || [],
        createdBy: req.user._id,
    });

    res.status(201).json(coupon);
});

// @desc    Get all coupons (Admin)
// @route   GET /api/coupons
// @access  Admin
export const getCoupons = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const filter = {};
    if (search) {
        filter.$or = [
            { code: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
        ];
    }

    const total = await Coupon.countDocuments(filter);
    const coupons = await Coupon.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name");

    res.json({ coupons, total, page, pages: Math.ceil(total / limit) });
});

// @desc    Get coupon by ID (Admin)
// @route   GET /api/coupons/:id
// @access  Admin
export const getCouponById = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id).populate("createdBy", "name");
    if (!coupon) {
        res.status(404);
        throw new Error("Coupon not found");
    }
    res.json(coupon);
});

// @desc    Update coupon (Admin)
// @route   PUT /api/coupons/:id
// @access  Admin
export const updateCoupon = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
        res.status(404);
        throw new Error("Coupon not found");
    }

    const {
        code, description, discountType, discountValue,
        minOrderAmount, maxDiscountAmount, maxUses,
        startDate, expiresAt, isActive, applicableCategories,
    } = req.body;

    if (code) coupon.code = code.toUpperCase();
    if (description !== undefined) coupon.description = description;
    if (discountType) coupon.discountType = discountType;
    if (discountValue !== undefined) coupon.discountValue = discountValue;
    if (minOrderAmount !== undefined) coupon.minOrderAmount = minOrderAmount;
    if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = maxDiscountAmount || null;
    if (maxUses !== undefined) coupon.maxUses = maxUses || null;
    if (startDate) coupon.startDate = startDate;
    if (expiresAt) coupon.expiresAt = expiresAt;
    if (isActive !== undefined) coupon.isActive = isActive;
    if (applicableCategories) coupon.applicableCategories = applicableCategories;

    const updated = await coupon.save();
    res.json(updated);
});

// @desc    Delete coupon (Admin)
// @route   DELETE /api/coupons/:id
// @access  Admin
export const deleteCoupon = asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
        res.status(404);
        throw new Error("Coupon not found");
    }
    await coupon.deleteOne();
    res.json({ message: "Coupon deleted successfully" });
});

// @desc    Validate coupon (Public - for customer checkout)
// @route   POST /api/coupons/validate
// @access  Private
export const validateCoupon = asyncHandler(async (req, res) => {
    const { code, orderAmount, userId } = req.body;

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
        res.status(404);
        throw new Error("Invalid coupon code");
    }

    if (!coupon.isActive) {
        res.status(400);
        throw new Error("This coupon is no longer active");
    }

    const now = new Date();
    if (now < coupon.startDate) {
        res.status(400);
        throw new Error("This coupon is not yet valid");
    }

    if (now > coupon.expiresAt) {
        res.status(400);
        throw new Error("This coupon has expired");
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        res.status(400);
        throw new Error("This coupon has reached its usage limit");
    }

    if (orderAmount < coupon.minOrderAmount) {
        res.status(400);
        throw new Error(`Minimum order amount of ₹${coupon.minOrderAmount} required`);
    }

    // Check if user already used this coupon
    if (userId && coupon.usedBy.some(u => u.user?.toString() === userId)) {
        res.status(400);
        throw new Error("You have already used this coupon");
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
        discountAmount = (orderAmount * coupon.discountValue) / 100;
        if (coupon.maxDiscountAmount) {
            discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
        }
    } else {
        discountAmount = coupon.discountValue;
    }
    discountAmount = Math.min(discountAmount, orderAmount);

    res.json({
        valid: true,
        coupon: {
            _id: coupon._id,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            description: coupon.description,
        },
        discountAmount: Math.round(discountAmount),
    });
});

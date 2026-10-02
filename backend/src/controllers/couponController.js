import Coupon from "../models/Coupon.js";
import asyncHandler from "../utils/asyncHandler.js";
import { evaluateCoupon, serializeCoupon } from "../utils/couponService.js";
import { recordAudit } from "../models/AuditLog.js";
import { asString, asInt, asNumber, asEnum, asObject, asObjectId, asBool, safeContains } from "../utils/input.js";

/**
 * couponController.js — admin CRUD + customer preview.
 *
 * The preview logic here is now a thin wrapper over `couponService.evaluateCoupon`,
 * the same function order creation uses. Previously this file had its own copy of
 * the rules AND orderController consulted a hardcoded array instead — three
 * implementations, and the customer's advertised discount had nothing to do with
 * what they were charged.
 */

const asNullableInt = (value, field, { min = 0, max = 10_000_000 } = {}) => {
  if (value === undefined || value === null || value === "") return null;
  return asInt(value, field, { min, max });
};

const asNullableNumber = (value, field, opts) => {
  if (value === undefined || value === null || value === "") return null;
  return asNumber(value, field, opts);
};

const readCouponFields = (body) => {
  const b = asObject(body, "request");
  const discountType = asEnum(b.discountType, ["percentage", "fixed"], "discount type", "percentage");
  const discountValue = asNumber(b.discountValue, "discount value", { min: 0, max: 10_000_000 });
  if (discountType === "percentage" && discountValue > 100) {
    const err = new Error("A percentage discount cannot exceed 100");
    err.status = 400;
    throw err;
  }
  if (discountValue === 0) {
    const err = new Error("Discount value must be greater than zero");
    err.status = 400;
    throw err;
  }

  const expiresAt = b.expiresAt ? new Date(b.expiresAt) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
    const err = new Error("A valid expiry date is required");
    err.status = 400;
    throw err;
  }
  if (expiresAt <= new Date()) {
    const err = new Error("The expiry date must be in the future");
    err.status = 400;
    throw err;
  }

  const startDate = b.startDate ? new Date(b.startDate) : new Date();
  if (Number.isNaN(startDate.getTime())) {
    const err = new Error("Invalid start date");
    err.status = 400;
    throw err;
  }

  return {
    code: asString(b.code, "coupon code", { max: 40 }).toUpperCase(),
    description: asString(b.description, "description", { max: 300 }),
    discountType,
    discountValue,
    minOrderAmount: asNullableInt(b.minOrderAmount, "minimum order", { max: 10_000_000 }) ?? 0,
    maxDiscountAmount: asNullableInt(b.maxDiscountAmount, "maximum discount", { max: 10_000_000 }),
    maxUses: asNullableInt(b.maxUses, "usage limit", { min: 1, max: 10_000_000 }),
    maxUsesPerUser: asNullableInt(b.maxUsesPerUser, "per-customer limit", { min: 1, max: 1000 }),
    startDate,
    expiresAt,
    isActive: asBool(b.isActive, "active", true),
    applicableCategories: Array.isArray(b.applicableCategories)
      ? b.applicableCategories.slice(0, 5).map((c) => asString(c, "category", { max: 40 }))
      : [],
  };
};

// @desc    Create coupon (Admin)
export const createCoupon = asyncHandler(async (req, res) => {
  const fields = readCouponFields(req.body);
  if (!fields.code) {
    res.status(400);
    throw new Error("Coupon code is required");
  }

  const existing = await Coupon.findOne({ code: fields.code });
  if (existing) {
    res.status(400);
    throw new Error("That coupon code already exists");
  }

  const coupon = await Coupon.create({ ...fields, createdBy: req.user._id });

  recordAudit(req, {
    action: "coupon.create",
    entity: "Coupon",
    entityId: String(coupon._id),
    after: { code: coupon.code, type: coupon.discountType, value: coupon.discountValue },
  });

  res.status(201).json(coupon);
});

// @desc    Get all coupons (Admin)
export const getCoupons = asyncHandler(async (req, res) => {
  const page = asInt(req.query.page, "page", { min: 1, max: 10000 });
  const limit = asInt(req.query.limit, "limit", { min: 1, max: 200 });
  const skip = (page - 1) * limit;
  const search = asString(req.query.search, "search", { max: 120 });

  const filter = {};
  if (search) {
    const rx = safeContains(search);
    filter.$or = [{ code: { $regex: rx } }, { description: { $regex: rx } }];
  }
  if (req.query.status === "active") filter.isActive = true;
  if (req.query.status === "expired") filter.expiresAt = { $lt: new Date() };

  const [total, coupons] = await Promise.all([
    Coupon.countDocuments(filter),
    Coupon.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name")
      .lean(),
  ]);

  res.json({ coupons, total, page, pages: Math.ceil(total / limit) || 1 });
});

// @desc    Get coupon by ID (Admin)
export const getCouponById = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "coupon id");
  const coupon = await Coupon.findById(id).populate("createdBy", "name");
  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }
  res.json(coupon);
});

// @desc    Update coupon (Admin)
export const updateCoupon = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "coupon id");
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }

  // Merge with existing values so the same validator runs on partial updates.
  const merged = { ...coupon.toObject(), ...req.body };
  const fields = readCouponFields(merged);

  if (fields.code !== coupon.code) {
    const taken = await Coupon.findOne({ code: fields.code, _id: { $ne: id } });
    if (taken) {
      res.status(400);
      throw new Error("That coupon code already exists");
    }
  }

  // Don't let an edit retroactively drop usedCount below redemptions that
  // already happened — otherwise the usage cap silently resets.
  if (fields.maxUses != null && coupon.usedCount > fields.maxUses) {
    const err = new Error(
      `This coupon has already been used ${coupon.usedCount} times, so the limit can't be lower than that.`
    );
    err.status = 400;
    throw err;
  }

  Object.assign(coupon, fields);
  const updated = await coupon.save();

  recordAudit(req, {
    action: "coupon.update",
    entity: "Coupon",
    entityId: String(coupon._id),
    after: { code: updated.code, isActive: updated.isActive, maxUses: updated.maxUses },
    severity: "warning",
  });

  res.json(updated);
});

// @desc    Delete coupon (Admin)
export const deleteCoupon = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "coupon id");
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }

  // Don't destroy the redemption record for a coupon that's in live use.
  if (coupon.usedCount > 0) {
    coupon.isActive = false;
    await coupon.save();
    return res.json({
      message: `This coupon has been used ${coupon.usedCount} times, so it was deactivated instead of deleted.`,
      deactivated: true,
    });
  }

  await coupon.deleteOne();

  recordAudit(req, {
    action: "coupon.delete",
    entity: "Coupon",
    entityId: String(coupon._id),
    severity: "warning",
  });

  res.json({ message: "Coupon deleted successfully" });
});

/**
 * @desc    Preview a coupon against the customer's cart (Private)
 * @route   POST /api/coupons/validate
 * @access  Private
 *
 * Kept as a thin alias so the existing frontend call works, but the rules are
 * now identical to those applied at order creation.
 */
export const validateCoupon = asyncHandler(async (req, res) => {
  const code = asString(req.body?.code, "coupon code", { max: 40 });
  if (!code) {
    res.status(400);
    throw new Error("Enter a coupon code");
  }

  const orderAmount = asNumber(req.body?.orderAmount, "order amount", { min: 0, max: 10_000_000 });

  // userId now comes from the authenticated session, never the request body —
  // previously the per-customer usage limit was trivially bypassed by omitting it.
  const result = await evaluateCoupon(code, {
    subtotal: orderAmount,
    userId: req.user._id,
  });

  if (!result.valid) {
    res.status(400).json({ message: result.message, reason: result.reason, valid: false });
    return;
  }

  res.json({
    valid: true,
    code: result.coupon.code,
    discount: result.discount,
    discountAmount: result.discount,
    discountType: result.coupon.discountType,
    discountValue: result.coupon.discountValue,
    description: result.coupon.description,
    coupon: {
      _id: result.coupon._id,
      code: result.coupon.code,
      discountType: result.coupon.discountType,
      discountValue: result.coupon.discountValue,
      description: result.coupon.description,
    },
    message: result.message,
  });
});

/**
 * Public list of currently-redeemable coupons, so the storefront can advertise
 * real offers instead of a hardcoded array that drifts out of date.
 */
export const getPublicCoupons = asyncHandler(async (req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({
    isActive: true,
    expiresAt: { $gt: now },
    $or: [{ startDate: { $lte: now } }, { startDate: null }],
  })
    .sort({ minOrderAmount: 1 })
    .limit(30)
    .lean();

  res.json(
    coupons
      .filter((c) => c.maxUses == null || c.usedCount < c.maxUses)
      .map((c) => serializeCoupon(c, 0))
  );
});
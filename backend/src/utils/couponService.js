import Coupon from "../models/Coupon.js";
import { asString } from "./input.js";

/**
 * couponService.js — the ONLY place coupon rules are evaluated.
 *
 * Previously there were two independent coupon systems: a hardcoded array in
 * utils/coupons.js used at order-creation time, and the Mongo-backed Coupon
 * model used by the validate endpoint the frontend calls. A coupon created by
 * the admin would validate in the UI ("You're saving ₹400!") and then be
 * silently dropped at checkout — the customer was charged full price.
 *
 * Now both the preview endpoint and order creation call `evaluateCoupon`, so
 * the advertised discount and the charged discount cannot diverge.
 */

/** Reasons a coupon can be rejected — surfaced verbatim to the customer. */
const REJECT = {
  NOT_FOUND: "That coupon code isn't valid",
  INACTIVE: "That coupon is no longer active",
  NOT_STARTED: "That coupon isn't active yet",
  EXPIRED: "That coupon has expired",
  MAXED_OUT: "That coupon has been fully redeemed",
  MIN_ORDER: (min) => `Add ₹${min.toLocaleString("en-IN")} more to use this coupon`,
  ALREADY_USED: "You've already used this coupon",
  CATEGORY: "That coupon doesn't apply to the items in your cart",
  EMPTY_CART: "Add something to your cart before applying a coupon",
};

/**
 * Evaluate a coupon against an order.
 *
 * @param {string} rawCode              Coupon code from the client (coerced here).
 * @param {object} opts
 * @param {number} opts.subtotal        Cart subtotal from server-verified prices.
 * @param {string} [opts.userId]        Enables the per-customer usage check.
 * @param {string[]} [opts.categories]  Categories present in the cart.
 * @returns {Promise<{valid: boolean, code?: string, discount: number, message?: string, reason?: string, coupon?: object}>}
 */
export async function evaluateCoupon(rawCode, { subtotal, userId, categories } = {}) {
  const code = asString(rawCode, "coupon code", { max: 40 }).toUpperCase();
  if (!code) {
    return { valid: false, discount: 0, reason: "MISSING", message: "Enter a coupon code" };
  }

  const coupon = await Coupon.findOne({ code });
  if (!coupon) {
    return { valid: false, discount: 0, reason: "NOT_FOUND", message: REJECT.NOT_FOUND };
  }
  if (!coupon.isActive) {
    return { valid: false, discount: 0, reason: "INACTIVE", message: REJECT.INACTIVE, coupon };
  }

  const now = new Date();
  if (coupon.startDate && now < new Date(coupon.startDate)) {
    return { valid: false, discount: 0, reason: "NOT_STARTED", message: REJECT.NOT_STARTED, coupon };
  }
  if (coupon.expiresAt && now > new Date(coupon.expiresAt)) {
    return { valid: false, discount: 0, reason: "EXPIRED", message: REJECT.EXPIRED, coupon };
  }

  // Global redemption cap
  if (coupon.maxUses !== null && coupon.maxUses !== undefined) {
    if (coupon.usedCount >= coupon.maxUses) {
      return { valid: false, discount: 0, reason: "MAXED_OUT", message: REJECT.MAXED_OUT, coupon };
    }
  }

  // Per-customer cap — previously read from the request body, so trivially bypassed
  if (userId) {
    const alreadyUsed = (coupon.usedBy || []).some(
      (u) => String(u?.user) === String(userId)
    );
    if (alreadyUsed) {
      return {
        valid: false,
        discount: 0,
        reason: "ALREADY_USED",
        message: REJECT.ALREADY_USED,
        coupon,
      };
    }
  }

  const amount = Math.max(0, Number(subtotal) || 0);
  if (amount <= 0) {
    return { valid: false, discount: 0, reason: "EMPTY_CART", message: REJECT.EMPTY_CART, coupon };
  }

  if (coupon.minOrderAmount > 0 && amount < coupon.minOrderAmount) {
    return {
      valid: false,
      discount: 0,
      reason: "MIN_ORDER",
      message: REJECT.MIN_ORDER(coupon.minOrderAmount),
      coupon,
    };
  }

  // Category restriction — was stored on the model but never enforced
  const allowed = coupon.applicableCategories || [];
  if (allowed.length > 0) {
    const present = new Set((categories || []).map((c) => String(c)));
    const match = allowed.some((c) => present.has(String(c)));
    if (!match) {
      return { valid: false, discount: 0, reason: "CATEGORY", message: REJECT.CATEGORY, coupon };
    }
  }

  let discount =
    coupon.discountType === "percentage"
      ? Math.round((amount * Number(coupon.discountValue)) / 100)
      : Number(coupon.discountValue) || 0;

  if (coupon.discountType === "percentage" && coupon.maxDiscountAmount) {
    discount = Math.min(discount, Number(coupon.maxDiscountAmount));
  }
  // A discount can never exceed the amount it discounts
  discount = Math.min(Math.max(0, Math.round(discount)), amount);

  return {
    valid: true,
    discount,
    coupon,
    code: coupon.code,
    description: coupon.description || `${coupon.discountValue}${coupon.discountType === "percentage" ? "% off" : " off"}`,
    message: `Coupon applied — you saved ₹${discount.toLocaleString("en-IN")}`,
  };
}

/** Public shape for the "available coupons" endpoint. */
export function serializeCoupon(coupon, subtotal = 0) {
  const discount =
    coupon.discountType === "percentage"
      ? Math.round((Math.max(0, subtotal) * Number(coupon.discountValue)) / 100)
      : Number(coupon.discountValue) || 0;
  const capped =
    coupon.discountType === "percentage" && coupon.maxDiscountAmount
      ? Math.min(discount, Number(coupon.maxDiscountAmount))
      : discount;
  return {
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minOrderAmount: coupon.minOrderAmount,
    maxDiscountAmount: coupon.maxDiscountAmount,
    maxUses: coupon.maxUses,
    usedCount: coupon.usedCount,
    expiresAt: coupon.expiresAt,
    applicableCategories: coupon.applicableCategories || [],
    estimatedDiscount: Math.min(capped, Math.max(0, subtotal)),
  };
}

/**
 * Atomically reserve one redemption slot.
 * Returns false when the coupon hit its global cap between preview and checkout.
 */
export async function reserveRedemption(couponId, userId, session) {
  const coupon = await Coupon.findById(couponId).session(session || null);
  if (!coupon) return false;
  if (coupon.maxUses !== null && coupon.maxUses !== undefined) {
    if (coupon.usedCount >= coupon.maxUses) return false;
  }
  const result = await Coupon.updateOne(
    { _id: couponId, ...(coupon.maxUses != null ? { usedCount: { $lt: coupon.maxUses } } : {}) },
    { $inc: { usedCount: 1 }, $push: { usedBy: { user: userId, usedAt: new Date() } } },
    { session }
  );
  return result.modifiedCount === 1;
}

/** Give a reserved slot back when the order fails to complete. */
export async function releaseRedemption(couponId, userId, session) {
  await Coupon.updateOne(
    { _id: couponId, "usedBy.user": userId },
    { $inc: { usedCount: -1 }, $pull: { usedBy: { user: userId } } },
    { session }
  );
}
/**
 * pricing.js — Single source of truth for all pricing logic.
 * Import these constants and functions everywhere instead of
 * hardcoding values in Cart, Checkout, PlaceOrder, and the backend.
 */

// ── Thresholds & Rates ───────────────────────────────────────────────────────
export const FREE_SHIPPING_THRESHOLD = 2000; // ₹2,000 and above = free delivery
export const SHIPPING_COST = 100;            // Flat ₹100 below threshold
export const TAX_RATE = 0;                   // GST handled separately at business level

// ── Shipping Calculator ──────────────────────────────────────────────────────
/**
 * Returns the shipping cost for a given subtotal.
 * Uses >= (i.e. exactly ₹2,000 qualifies for free shipping).
 * @param {number} subtotal - Cart subtotal before shipping
 * @returns {number} Shipping cost in rupees
 */
export const calculateShipping = (subtotal) => {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
};

// ── Tax Calculator ───────────────────────────────────────────────────────────
/**
 * Returns the tax amount for a given subtotal.
 * Currently 0 — tax is included in listed prices.
 * @param {number} subtotal
 * @returns {number}
 */
export const calculateTax = (subtotal) => {
  return Math.round(subtotal * TAX_RATE);
};

// ── Order Total ──────────────────────────────────────────────────────────────
/**
 * Computes the full order total.
 * @param {number} subtotal
 * @param {number} discount - Coupon discount amount (already validated)
 * @returns {{ subtotal, shipping, tax, discount, total }}
 */
export const calculateOrderTotals = (subtotal, discount = 0) => {
  const shipping = calculateShipping(subtotal);
  const tax = calculateTax(subtotal);
  const total = Math.max(0, subtotal + shipping + tax - discount);
  return { subtotal, shipping, tax, discount, total };
};

// ── Free Shipping Progress ───────────────────────────────────────────────────
/**
 * Returns how much more the customer needs to spend for free shipping.
 * @param {number} subtotal
 * @returns {number} Amount remaining, or 0 if already qualifies
 */
export const amountToFreeShipping = (subtotal) => {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
};

// ── Format price for display ─────────────────────────────────────────────────
/**
 * Formats a number as Indian Rupees.
 * @param {number} amount
 * @returns {string} e.g. "₹1,499"
 */
export const formatPrice = (amount) => {
  return `₹${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

/**
 * pricing.js — frontend pricing helpers for DISPLAY only.
 *
 * The server is the sole authority on what a customer is charged: `POST /api/orders`
 * re-derives every price from the database and recomputes the total. This module
 * exists so the numbers shown in the cart and on the order-summary screen match
 * the server, not so the client can decide anything.
 *
 * MUST stay in sync with backend/src/config/pricing.js.
 */

export const FREE_SHIPPING_THRESHOLD = 2000;
export const TAX_RATE = 0;
export const MAX_QTY_PER_ITEM = 10;

export const SHIPPING_METHODS = [
  {
    id: "standard",
    label: "Standard Delivery",
    daysLabel: "4-6 business days",
    price: 99,
    freeAbove: 2000,
    description: "Reliable and affordable",
  },
  {
    id: "express",
    label: "Express Delivery",
    daysLabel: "2-3 business days",
    price: 199,
    freeAbove: 5000,
    description: "Priority handling, dispatched first",
  },
];

export const DEFAULT_SHIPPING_METHOD = "standard";

export const getShippingMethod = (id) =>
  SHIPPING_METHODS.find((m) => m.id === id) || SHIPPING_METHODS[0];

export const calculateShipping = (subtotal, methodId = DEFAULT_SHIPPING_METHOD) => {
  const method = getShippingMethod(methodId);
  return subtotal >= method.freeAbove ? 0 : method.price;
};

export const calculateTax = (subtotal) => Math.round(subtotal * TAX_RATE);

/** Effective unit price after the product's own percentage discount. */
export const effectiveUnitPrice = (product) => {
  const price = Number(product?.price) || 0;
  const discount = Number(product?.discount) || 0;
  if (discount <= 0) return price;
  return Math.max(0, Math.round(price * (1 - Math.min(discount, 100) / 100)));
};

export const calculateOrderTotals = (
  subtotal,
  discount = 0,
  methodId = DEFAULT_SHIPPING_METHOD
) => {
  const safeSubtotal = Math.max(0, Math.round(subtotal || 0));
  const safeDiscount = Math.min(Math.max(0, Math.round(discount || 0)), safeSubtotal);
  const shipping = calculateShipping(safeSubtotal - safeDiscount, methodId);
  const tax = calculateTax(safeSubtotal);
  const total = Math.max(0, safeSubtotal + shipping + tax - safeDiscount);
  return { subtotal: safeSubtotal, shipping, tax, discount: safeDiscount, total };
};

export const amountToFreeShipping = (subtotal) =>
  Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

// ── Formatting ────────────────────────────────────────────────────────────────

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatPrice = (amount) => `₹${inr.format(Number(amount) || 0)}`;

export const formatPriceExact = (amount) => `₹${inrPaise.format(Number(amount) || 0)}`;

/** Compact form for dense grids: ₹1.2L / ₹45K. */
export const formatCompactPrice = (amount) => {
  const n = Number(amount) || 0;
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `₹${inr.format(n)}`;
};

export const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};
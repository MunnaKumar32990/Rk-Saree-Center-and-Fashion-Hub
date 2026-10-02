/**
 * pricing.js — BACKEND source of truth for money.
 *
 * The order total is computed here and ONLY here. The frontend mirrors these
 * values in `src/utils/pricing.js` purely for display; the server recomputes
 * everything from database prices before persisting an order, so a tampered
 * client can never change what is charged.
 *
 * KEEP IN SYNC with frontend/src/utils/pricing.js
 */

export const FREE_SHIPPING_THRESHOLD = 2000; // ₹2,000+ = free standard delivery
export const TAX_RATE = 0; // Prices are GST-inclusive; no separate tax line

/**
 * Shipping tiers.
 *
 * The site previously advertised "Express shipping (2-3 days, ₹200)" in
 * ShippingInfo.jsx but had no code path for it — customers were told an option
 * that did not exist. Express is now real and selectable at checkout.
 */
export const SHIPPING_METHODS = [
  {
    id: "standard",
    label: "Standard Delivery",
    days: 4,
    daysLabel: "4-6 business days",
    price: 99,
    freeAbove: 2000,
    description: "Reliable and affordable, via Delhivery / India Post",
  },
  {
    id: "express",
    label: "Express Delivery",
    days: 2,
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

/**
 * Round to paise-aware 2dp and guard against float drift.
 * All money in this app is whole rupees, so we round to integers.
 */
const rupees = (n) => Math.max(0, Math.round(n));

/**
 * Compute the authoritative order total.
 * The discount is clamped so it can never exceed what is being discounted.
 */
export function calculateOrderTotals(subtotal, discount = 0, methodId = DEFAULT_SHIPPING_METHOD) {
  const safeSubtotal = rupees(subtotal);
  const safeDiscount = Math.min(rupees(discount), safeSubtotal);
  const shipping = calculateShipping(safeSubtotal - safeDiscount, methodId);
  const tax = calculateTax(safeSubtotal);
  const total = Math.max(0, safeSubtotal + shipping + tax - safeDiscount);
  return { subtotal: safeSubtotal, shipping, tax, discount: safeDiscount, total };
}

/**
 * Effective unit price after the product's own percentage discount.
 * Used everywhere instead of re-deriving `price * (1 - discount/100)` inline.
 */
export function effectiveUnitPrice(product) {
  const price = rupees(product?.price ?? 0);
  const discount = Number(product?.discount ?? 0);
  if (!discount || discount <= 0) return price;
  const pct = Math.min(discount, 100);
  return rupees(price * (1 - pct / 100));
}

/**
 * Estimated delivery window, used for the trust badge at checkout and the
 * order-confirmation message. Research shows an exact window converts ~2x
 * better than a vague "ships in 2-5 days".
 */
export function deliveryEstimate(methodId = DEFAULT_SHIPPING_METHOD, from = new Date()) {
  const method = getShippingMethod(methodId);
  const addBusinessDays = (start, days) => {
    const d = new Date(start);
    let added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      const day = d.getDay();
      if (day !== 0 && day !== 6) added += 1;
    }
    return d;
  };
  const fromDate = addBusinessDays(from, method.days);
  const toDate = addBusinessDays(from, method.days + 2);
  const fmt = (d) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${fmt(fromDate)} - ${fmt(toDate)}`;
}

/**
 * COD guard rails.
 *
 * COD is the dominant payment mode in tier-2/3 India and its single biggest
 * driver is RTO (return-to-origin). Ethnic wear runs 30-45% RTO; refusing COD
 * outright would cost ~34% of conversions, so instead we bound the exposure:
 * cap the order value and block pincodes we know are high-risk.
 */
export const COD_POLICY = {
  enabled: true,
  maxOrderValue: 25000, // Above this, online prepayment only (fraud + RTO cap)
  minOrderValue: 1,
  codFee: 0, // Keep free — a fee visibly reduces COD conversion
  maxCodFeePercent: 0,
  // Pincodes/pincode-prefixes with known elevated RTO. Extend as data arrives.
  blockedPincodePrefixes: [],
  // Block COD entirely for accounts whose returns exceed this share of orders.
  maxCustomerReturnRate: 0.4,
};

export function codEligibility({ totalPrice, postalCode, codBlocked = false } = {}) {
  if (!COD_POLICY.enabled) {
    return { eligible: false, reason: "Cash on Delivery is not available right now." };
  }
  if (codBlocked) {
    return {
      eligible: false,
      reason: "Online payment is required for your account to keep deliveries secure for everyone.",
    };
  }
  const pin = String(postalCode || "");
  const badPrefix = COD_POLICY.blockedPincodePrefixes.find((p) => pin.startsWith(p));
  if (badPrefix) {
    return {
      eligible: false,
      reason: "Cash on Delivery is not available for this PIN code. Online payment is.",
    };
  }
  if (Number(totalPrice) > COD_POLICY.maxOrderValue) {
    return {
      eligible: false,
      reason: `For orders above ₹${COD_POLICY.maxOrderValue.toLocaleString("en-IN")}, secure online payment is required.`,
    };
  }
  return { eligible: true, fee: COD_POLICY.codFee };
}
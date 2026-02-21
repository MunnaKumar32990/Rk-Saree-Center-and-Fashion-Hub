/**
 * Hardcoded coupon store.
 * To add new coupons, just push to this array.
 * Each coupon: { code, type: "percent"|"flat", value, minOrder, description, expiry }
 */
export const COUPONS = [
    {
        code: "WELCOME10",
        type: "percent",
        value: 10,
        minOrder: 500,
        description: "10% off for new customers",
        expiry: new Date("2026-12-31"),
    },
    {
        code: "FLAT200",
        type: "flat",
        value: 200,
        minOrder: 1500,
        description: "₹200 flat discount",
        expiry: new Date("2026-12-31"),
    },
    {
        code: "SAREE20",
        type: "percent",
        value: 20,
        minOrder: 2000,
        description: "20% off on saree orders",
        expiry: new Date("2026-12-31"),
    },
    {
        code: "FESTIVE15",
        type: "percent",
        value: 15,
        minOrder: 1000,
        description: "15% festive season discount",
        expiry: new Date("2026-12-31"),
    },
    {
        code: "FREESHIP",
        type: "flat",
        value: 100,
        minOrder: 0,
        description: "Free shipping on any order",
        expiry: new Date("2026-12-31"),
    },
];

/**
 * Validate a coupon code against an order total.
 * Returns { valid, coupon, discount, message }
 */
export function validateCoupon(code, orderTotal) {
    const coupon = COUPONS.find(
        (c) => c.code.toUpperCase() === code.toUpperCase().trim()
    );

    if (!coupon) {
        return { valid: false, message: "Invalid coupon code" };
    }

    if (new Date() > coupon.expiry) {
        return { valid: false, message: "This coupon has expired" };
    }

    if (orderTotal < coupon.minOrder) {
        return {
            valid: false,
            message: `Minimum order of ₹${coupon.minOrder} required for this coupon`,
        };
    }

    const discount =
        coupon.type === "percent"
            ? Math.round((orderTotal * coupon.value) / 100)
            : coupon.value;

    return {
        valid: true,
        coupon,
        discount: Math.min(discount, orderTotal), // can't exceed order total
        message: coupon.description,
    };
}

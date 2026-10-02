import mongoose from "mongoose";

const orderItemSchema = mongoose.Schema({
  name: { type: String, required: true },
  qty: {
    type: Number,
    required: true,
    // Guarded again in the controller; a non-positive qty reaching this point
    // would corrupt revenue totals (a negative qty * passes a `stock < qty`
    // check and produces a negative line total).
    min: [1, "Quantity must be at least 1"],
    max: [10, "Maximum 10 per item"],
  },
  image: { type: String, default: "" },
  price: { type: Number, required: true, min: 0 },
  size: { type: String, default: "" },
  color: { type: String, default: "" },
  // Snapshot of the saree specs at purchase time. A customer disputing
  // "the blouse piece was 0.8m" six months later must be answered with what
  // was actually advertised on the day, not whatever the product says now.
  sku: { type: String, default: "" },
  specsSnapshot: {
    fabric: { type: String, default: "" },
    lengthMeters: { type: Number, default: null },
    widthInches: { type: Number, default: null },
    blousePieceIncluded: { type: Boolean, default: false },
    blousePieceMeters: { type: Number, default: null },
    weave: { type: String, default: "" },
    zariType: { type: String, default: "" },
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Product",
  },
  // Set when this line is returned separately from the rest of the order
  isReturned: { type: Boolean, default: false },
  isRestocked: { type: Boolean, default: false },
});

const addressSchema = {
  fullName: { type: String, default: "" },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, default: "" },
  postalCode: { type: String, required: true },
  country: { type: String, required: true, default: "India" },
  phone: { type: String, required: true },
  landmark: { type: String, default: "" },
};

const statusHistorySchema = mongoose.Schema({
  status: { type: String, required: true },
  note: { type: String, default: "" },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  changedByName: { type: String, default: "System" },
  updatedAt: { type: Date, default: Date.now },
});

const ALL_STATUSES = [
  "Pending Payment",
  "Paid",
  "Confirmed",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Returned",
  "Refunded",
  "Cancelled",
];

const orderSchema = mongoose.Schema(
  {
    orderNumber: { type: String, index: true },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    orderItems: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0 && v.length <= 50,
        message: "Order must contain between 1 and 50 items",
      },
    },

    shippingAddress: addressSchema,
    billingAddress: {
      fullName: { type: String, default: "" },
      address: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      country: { type: String, default: "India" },
      phone: { type: String, default: "" },
      sameAsShipping: { type: Boolean, default: true },
    },

    paymentMethod: {
      type: String,
      required: true,
      enum: ["Razorpay", "COD", "UPI", "Stripe"],
      default: "COD",
    },
    paymentResult: {
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
      razorpaySignature: { type: String },
      transactionId: { type: String },
      paymentGateway: { type: String },
      method: { type: String }, // upi / card / netbanking / wallet — from Razorpay
      status: { type: String },
      updateTime: { type: String },
    },
    refundId: { type: String, default: "" },
    refundStatus: {
      type: String,
      enum: ["None", "Requested", "Processing", "Refunded", "Rejected", "Failed"],
      default: "None",
    },
    refundAmount: { type: Number, default: 0 },
    refundNote: { type: String, default: "" },

    itemsPrice: { type: Number, required: true, default: 0.0, min: 0 },
    shippingPrice: { type: Number, required: true, default: 0.0, min: 0 },
    taxPrice: { type: Number, required: true, default: 0.0, min: 0 },
    shippingMethod: { type: String, default: "standard" },
    shippingMethodLabel: { type: String, default: "Standard Delivery" },
    estimatedDelivery: { type: String, default: "" },
    // Single canonical discount field. Previously both `discountPrice` and
    // `couponDiscount` held the same number, so anything summing both
    // double-counted.
    discountPrice: { type: Number, default: 0.0, min: 0 },
    couponCode: { type: String, default: "" },
    couponDiscount: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true, default: 0.0, min: 0 },

    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },

    status: {
      type: String,
      enum: ALL_STATUSES,
      default: "Pending Payment",
    },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },

    // Inventory bookkeeping — makes restock idempotent. Without this,
    // "restocked" was set to true but no Product row was ever touched.
    inventoryRestored: { type: Boolean, default: false },
    stockDeducted: { type: Boolean, default: false },

    // Shipment tracking
    trackingNumber: { type: String, default: "" },
    courierName: { type: String, default: "" },
    trackingUrl: { type: String, default: "" },
    shippedAt: { type: Date },

    /**
     * Cash-on-delivery confirmation.
     *
     * COD drives 40-90% of orders in tier-2/3 India and COD RTO runs 22-35%
     * (rising to ~58% in the festive quarter). The single intervention with the
     * best documented ROI is confirming the order with the customer on WhatsApp
     * within minutes of placement, which roughly halves RTO. This block is the
     * server-side record of that handshake.
     */
    cod: {
      status: {
        type: String,
        enum: ["not_applicable", "pending", "confirmed", "cancelled", "expired"],
        default: "not_applicable",
      },
      confirmedAt: { type: Date },
      confirmedVia: { type: String, default: "" }, // "whatsapp" | "call" | "manual"
      remindersSent: { type: Number, default: 0 },
      lastReminderAt: { type: Date },
      autoCancelAt: { type: Date },
      failureReason: { type: String, default: "" },
    },

    statusHistory: [statusHistorySchema],
    orderNotes: { type: String, default: "", maxlength: 2000 },
    isGift: { type: Boolean, default: false },
    giftNote: { type: String, default: "", maxlength: 500 },
    giftWrap: { type: Boolean, default: false },

    // Abandoned-checkout recovery / post-purchase sequencing
    marketingOptIn: { type: Boolean, default: false },
    reviewRequestedAt: { type: Date },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ isPaid: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "cod.status": 1, "cod.autoCancelAt": 1 });
orderSchema.index({ trackingNumber: 1 });

/** Auto-assign a human-friendly order number (RKS-2026-X7F2AB). */
orderSchema.pre("validate", function () {
  if (!this.orderNumber) {
    const year = new Date().getFullYear();
    this.orderNumber = `RKS-${year}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
  }
});

// Valid next statuses map (prevents invalid transitions)
orderSchema.statics.VALID_TRANSITIONS = {
  "Pending Payment": ["Paid", "Cancelled"],
  Paid: ["Confirmed", "Cancelled"],
  Confirmed: ["Packed", "Cancelled"],
  Packed: ["Shipped", "Cancelled"],
  Shipped: ["Out for Delivery"],
  "Out for Delivery": ["Delivered"],
  Delivered: ["Returned"],
  Returned: ["Refunded"],
  Refunded: [],
  Cancelled: [],
};

/** Terminal statuses — an order in one of these can never change again. */
const TERMINAL_STATUSES = new Set(["Refunded", "Cancelled"]);

orderSchema.statics.ALL_STATUSES = ALL_STATUSES;
orderSchema.statics.TERMINAL_STATUSES = [...TERMINAL_STATUSES];

/**
 * Assert a status transition is legal.
 *
 * The transitions map existed but was only consulted by one of five mutation
 * paths: `markOrderDelivered` set Delivered from any state, `bulkUpdateStatus`
 * used `updateMany` with no check at all, and `updateOrderStatus` had a
 * `validNext.length > 0 &&` short-circuit that made every terminal status
 * accept anything — so a Cancelled order could be resurrected to Delivered.
 */
orderSchema.statics.assertTransition = function (currentStatus, nextStatus) {
  /**
   * Terminal states are checked BEFORE the same-status short-circuit.
   * Otherwise `Cancelled -> Cancelled` returned true, which let a second cancel
   * run the whole handler again — and although `inventoryRestored` made the
   * restock idempotent, a second "cancelled successfully" response for an order
   * that was already cancelled is exactly the kind of confusion that precedes a
   * support ticket.
   */
  if (TERMINAL_STATUSES.has(currentStatus)) {
    const err = new Error(
      `Order is already ${currentStatus.toLowerCase()} and can no longer be changed. Please contact support if this is wrong.`
    );
    err.status = 400;
    throw err;
  }

  // Idempotent re-application of the same non-terminal status is a no-op.
  if (currentStatus === nextStatus) return true;

  const allowed = orderSchema.statics.VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    const err = new Error(
      `Cannot change order status from "${currentStatus}" to "${nextStatus}".`
    );
    err.status = 400;
    throw err;
  }
  return true;
};

orderSchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  },
});

const Order = mongoose.model("Order", orderSchema);
export default Order;
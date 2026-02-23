import mongoose from "mongoose";

const orderItemSchema = mongoose.Schema({
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  size: { type: String, default: "" },
  color: { type: String, default: "" },
  sku: { type: String, default: "" },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Product",
  },
});

const addressSchema = {
  fullName: { type: String, default: "" },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, default: "" },
  postalCode: { type: String, required: true },
  country: { type: String, required: true, default: "India" },
  phone: { type: String, required: true },
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
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    orderItems: [orderItemSchema],

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
      status: { type: String },
      updateTime: { type: String },
    },
    refundId: { type: String, default: "" },
    refundStatus: {
      type: String,
      enum: ["None", "Requested", "Processing", "Refunded", "Rejected"],
      default: "None",
    },
    refundAmount: { type: Number, default: 0 },

    itemsPrice: { type: Number, required: true, default: 0.0 },
    shippingPrice: { type: Number, required: true, default: 0.0 },
    taxPrice: { type: Number, required: true, default: 0.0 },
    discountPrice: { type: Number, default: 0.0 },
    couponCode: { type: String, default: "" },
    couponDiscount: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true, default: 0.0 },

    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },

    status: {
      type: String,
      enum: ALL_STATUSES,
      default: "Pending Payment",
    },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },

    // Shipment tracking
    trackingNumber: { type: String, default: "" },
    courierName: { type: String, default: "" },
    trackingUrl: { type: String, default: "" },

    statusHistory: [statusHistorySchema],
    orderNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

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

orderSchema.statics.ALL_STATUSES = ALL_STATUSES;

const Order = mongoose.model("Order", orderSchema);
export default Order;

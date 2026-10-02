import mongoose from "mongoose";

const returnTimelineSchema = mongoose.Schema({
  status: { type: String, required: true },
  note: { type: String, default: "" },
  changedBy: { type: String, default: "System" },
  updatedAt: { type: Date, default: Date.now },
});

const returnRequestSchema = mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Order",
      // Unique — this is also what closes the duplicate-submission race where
      // two rapid taps both passed the "does a request already exist?" check.
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    reason: {
      type: String,
      required: true,
      enum: [
        "Wrong size",
        "Wrong item received",
        "Damaged/Defective",
        "Not as described",
        "Colour different from photo",
        "Changed mind",
        "Other",
      ],
    },
    reasonDetail: { type: String, default: "", maxlength: 2000 },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Refunded", "Restocked"],
      default: "Pending",
    },
    adminNote: { type: String, default: "", maxlength: 2000 },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundId: { type: String, default: "" },
    restocked: { type: Boolean, default: false },
    // Which items the customer is returning — partial returns were impossible
    // before, so a 3-item order where 1 was wrong forced a full refund.
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: { type: String, default: "" },
        qty: { type: Number, default: 1, min: 1 },
      },
    ],
    // Reverse logistics
    pickupScheduled: { type: Boolean, default: false },
    reversePickupDate: { type: Date },
    reverseAwb: { type: String, default: "" },
    // Item was returned after blouse stitching / fall-pico / pre-draping, which
    // makes it non-returnable under the published policy.
    nonReturnableReason: { type: String, default: "" },
    timeline: [returnTimelineSchema],
  },
  { timestamps: true }
);

returnRequestSchema.index({ user: 1, createdAt: -1 });
returnRequestSchema.index({ status: 1, createdAt: -1 });

returnRequestSchema.set("toJSON", {
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  },
});

const ReturnRequest = mongoose.model("ReturnRequest", returnRequestSchema);
export default ReturnRequest;
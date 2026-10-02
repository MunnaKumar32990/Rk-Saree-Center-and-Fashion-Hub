import mongoose from "mongoose";

const couponSchema = mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 40,
    },
    description: {
      type: String,
      default: "",
      maxlength: 300,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
      default: "percentage",
    },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0, "Discount value cannot be negative"],
      // Without this ceiling, a percentage coupon valued at 500 produces a
      // 500% discount. Validation now lives on both the schema and the service.
      validate: {
        validator(v) {
          return this.discountType !== "percentage" || v <= 100;
        },
        message: "Percentage discount cannot exceed 100",
      },
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      default: null, // null means no cap
      min: 0,
    },
    maxUses: {
      type: Number,
      default: null, // null means unlimited
      min: 1,
    },
    // Previously declared but never incremented anywhere, so maxUses and the
    // per-user limit were permanently unenforceable.
    maxUsesPerUser: {
      type: Number,
      default: null,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    usedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        usedAt: { type: Date, default: Date.now },
      },
    ],
    startDate: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Previously stored but never checked at validation time.
    applicableCategories: {
      type: [String],
      default: [], // empty = all categories
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

couponSchema.index({ isActive: 1, expiresAt: 1 });

// Mongoose 9 hooks are promise-based: declaring a `next` parameter makes this a
// callback-style hook and throws. `invalidate()` surfaces via ValidationError.
couponSchema.pre("validate", function () {
  if (this.expiresAt && this.startDate && this.expiresAt <= this.startDate) {
    this.invalidate("expiresAt", "Expiry must be after the start date");
  }
  if (this.discountType === "percentage" && this.discountValue > 100) {
    this.invalidate("discountValue", "Percentage discount cannot exceed 100");
  }
});

couponSchema.virtual("isExpired").get(function () {
  return new Date() > this.expiresAt;
});

couponSchema.virtual("isMaxedOut").get(function () {
  return this.maxUses !== null && this.maxUses !== undefined && this.usedCount >= this.maxUses;
});

couponSchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret.__v;
    // Never expose the raw list of customers who used this code.
    delete ret.usedBy;
    return ret;
  },
});

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
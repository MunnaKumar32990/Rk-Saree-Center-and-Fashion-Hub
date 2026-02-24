import mongoose from "mongoose";

const couponSchema = mongoose.Schema(
    {
        code: {
            type: String,
            required: [true, "Coupon code is required"],
            unique: true,
            uppercase: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
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
        },
        minOrderAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        maxDiscountAmount: {
            type: Number,
            default: null, // null means no cap
        },
        maxUses: {
            type: Number,
            default: null, // null means unlimited
        },
        usedCount: {
            type: Number,
            default: 0,
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

// Virtual for status
couponSchema.virtual("isExpired").get(function () {
    return new Date() > this.expiresAt;
});

couponSchema.virtual("isMaxedOut").get(function () {
    return this.maxUses !== null && this.usedCount >= this.maxUses;
});

couponSchema.set("toJSON", { virtuals: true });

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;

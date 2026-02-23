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
                "Changed mind",
                "Other",
            ],
        },
        reasonDetail: { type: String, default: "" },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected", "Refunded", "Restocked"],
            default: "Pending",
        },
        adminNote: { type: String, default: "" },
        refundAmount: { type: Number, default: 0 },
        restocked: { type: Boolean, default: false },
        timeline: [returnTimelineSchema],
    },
    { timestamps: true }
);

const ReturnRequest = mongoose.model("ReturnRequest", returnRequestSchema);
export default ReturnRequest;

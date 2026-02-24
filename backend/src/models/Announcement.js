import mongoose from "mongoose";

const announcementSchema = mongoose.Schema(
    {
        message: {
            type: String,
            required: [true, "Announcement message is required"],
            trim: true,
        },
        type: {
            type: String,
            enum: ["info", "success", "warning", "offer"],
            default: "info",
        },
        bgColor: {
            type: String,
            default: "", // optional hex override, e.g. "#e11d48"
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        startDate: {
            type: Date,
            default: Date.now,
        },
        endDate: {
            type: Date,
            required: [true, "End date is required"],
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

// Virtual: is the announcement currently live?
announcementSchema.virtual("isLive").get(function () {
    const now = new Date();
    return this.isActive && now >= this.startDate && now <= this.endDate;
});

announcementSchema.set("toJSON", { virtuals: true });

const Announcement = mongoose.model("Announcement", announcementSchema);
export default Announcement;

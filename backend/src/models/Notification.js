import mongoose from "mongoose";

/**
 * Notification — the in-app notification feed (the "bell" the README promises).
 *
 * Email is unreliable for reach (22% open rate vs WhatsApp's 95%+), so status
 * changes are recorded here and surfaced in the UI, with email as a supplement.
 */

const notificationSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "order_placed",
        "order_confirmed",
        "order_packed",
        "order_shipped",
        "order_out_for_delivery",
        "order_delivered",
        "order_cancelled",
        "refund_processed",
        "return_update",
        "back_in_stock",
        "offer",
        "cod_action_required",
        "price_drop",
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    link: { type: String, default: "" },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

// (the `user` field is already indexed via `index: true` on the field above)

notificationSchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret) {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  },
});

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
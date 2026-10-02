import Notification from "../models/Notification.js";
import Order from "../models/Order.js";

/**
 * notify.js — fan-out of order/status events.
 *
 * Best-effort by design: a notification failure must never fail the business
 * operation that triggered it, so every function swallows and logs errors.
 */

/**
 * Create an in-app notification.
 * @returns {Promise<object|null>}
 */
export async function createNotification({ userId, type, title, message, link = "", order, product }) {
  try {
    if (!userId) return null;
    return await Notification.create({
      user: userId,
      type,
      title,
      message,
      link,
      order,
      product,
    });
  } catch (err) {
    console.error("[notify] create failed:", err?.message || err);
    return null;
  }
}

/** Create one notification per user (used for announcements/back-in-stock). */
export async function createBulkNotifications(userIds, payload) {
  const results = await Promise.allSettled(
    (userIds || []).map((userId) => createNotification({ userId, ...payload }))
  );
  return results.filter((r) => r.status === "fulfilled" && r.value).length;
}

/**
 * Is this customer a serial-return risk?
 *
 * Industry practice (Myntra, House of Anita Dongre brands) is to cap returns as
 * a share of total orders placed and switch repeat offenders to prepaid-only.
 * COD is the primary vector, so this feeds the COD eligibility check.
 */
export async function hasElevatedReturnRate(userId, threshold = 0.4) {
  try {
    const [total, returned] = await Promise.all([
      Order.countDocuments({ user: userId }),
      Order.countDocuments({ user: userId, status: { $in: ["Returned", "Refunded"] } }),
    ]);
    if (total < 3) return false; // not enough signal yet
    return returned / total > threshold;
  } catch {
    return false;
  }
}

/** How many orders does this customer have in each status? Used for order filters. */
export async function getUserStatusCounts(userId) {
  try {
    const rows = await Order.aggregate([
      { $match: { user: new (await import("mongoose")).Types.ObjectId(userId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    return rows.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {});
  } catch {
    return {};
  }
}
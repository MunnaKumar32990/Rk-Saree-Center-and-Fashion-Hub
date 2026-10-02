import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import ReturnRequest from "../models/ReturnRequest.js";
import asyncHandler from "../utils/asyncHandler.js";
import { evaluateCoupon, reserveRedemption, releaseRedemption, serializeCoupon } from "../utils/couponService.js";
import {
  calculateOrderTotals,
  effectiveUnitPrice,
  deliveryEstimate,
  getShippingMethod,
  codEligibility,
  COD_POLICY,
} from "../config/pricing.js";
import { decrementStock, restoreStock, withTransaction, OutOfStockError } from "../utils/inventory.js";
import { tryRefund } from "../utils/razorpay.js";
import { createNotification, hasElevatedReturnRate } from "../utils/notify.js";
import { initiateCodConfirmation } from "../utils/codService.js";
import {
  sendOrderConfirmation,
  sendOrderStatusUpdate,
  sendCancellationEmail,
  sendRefundEmail,
} from "../utils/emailService.js";
import { recordAudit } from "../models/AuditLog.js";
import {
  asString,
  asEmail,
  asInt,
  asNumber,
  asEnum,
  asText,
  asPincode,
  asPhone,
  asObject,
  asObjectId,
  safeContains,
} from "../utils/input.js";

const MAX_LINES_PER_ORDER = 50;
const MAX_QTY_PER_LINE = 10;

const ORDER_STATUSES = Order.ALL_STATUSES;
const PAYMENT_METHODS = ["Razorpay", "COD", "UPI", "Stripe"];

// ─── Helper ──────────────────────────────────────────────────────────────────
const buildOrderFilter = (query) => {
  const filter = {};

  if (query.status) filter.status = asEnum(query.status, ORDER_STATUSES, "status");

  if (query.paymentStatus === "paid") filter.isPaid = true;
  else if (query.paymentStatus === "unpaid") filter.isPaid = false;

  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) {
      const to = new Date(query.dateTo);
      if (Number.isNaN(to.getTime())) {
        const err = new Error("Invalid date");
        err.status = 400;
        throw err;
      }
      to.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = to;
    }
  }

  if (query.minPrice || query.maxPrice) {
    filter.totalPrice = {};
    if (query.minPrice) filter.totalPrice.$gte = asNumber(query.minPrice, "minPrice", { min: 0 });
    if (query.maxPrice) filter.totalPrice.$lte = asNumber(query.maxPrice, "maxPrice", { min: 0 });
  }

  return filter;
};

/** Coerce and validate a client-supplied address block. */
const parseAddress = (raw, field, { required = true } = {}) => {
  const src = asObject(raw, field);
  const address = asText(src.address, "Address", 500);
  const city = asText(src.city, "City", 120);
  const postalCode = asPincode(src.postalCode, "PIN code");
  const phone = asPhone(src.phone, "Phone number");

  if ((required && !address) || !city) {
    const err = new Error("Please complete your delivery address");
    err.status = 400;
    throw err;
  }

  return {
    fullName: asText(src.fullName, "Full name", 120),
    address,
    city,
    state: asText(src.state, "State", 120),
    postalCode,
    country: asText(src.country, "Country", 60) || "India",
    phone,
    landmark: asText(src.landmark, "Landmark", 200),
  };
};

// ─── Create Order ─────────────────────────────────────────────────────────────
// @route POST /api/orders
// @access Private
export const addOrderItems = asyncHandler(async (req, res) => {
  const body = asObject(req.body, "request");

  if (!Array.isArray(body.orderItems) || body.orderItems.length === 0) {
    const err = new Error("Your cart is empty");
    err.status = 400;
    throw err;
  }
  if (body.orderItems.length > MAX_LINES_PER_ORDER) {
    const err = new Error(`An order can contain at most ${MAX_LINES_PER_ORDER} different items`);
    err.status = 400;
    throw err;
  }

  const paymentMethod = asEnum(body.paymentMethod, PAYMENT_METHODS, "payment method", "COD");
  const shippingAddress = parseAddress(body.shippingAddress, "shipping address");
  const shippingMethodId = asString(body.shippingMethod, "shipping method", { max: 30 }) || "standard";
  const shippingMethod = getShippingMethod(shippingMethodId);

  // ── Step 1: Validate the cart shape ────────────────────────────────────────
  // qty was previously taken raw from the body. `qty: -5` passes a
  // `countInStock < qty` check (0 < -5 is false) and produces a negative line
  // total; `qty: 1.5` and `qty: "10"` were also accepted.
  const requested = body.orderItems.map((line, index) => {
    const src = asObject(line, `cart item ${index + 1}`);
    const productId = asObjectId(src.product || src._id, `cart item ${index + 1}`);
    const qty = asInt(src.qty, `quantity for item ${index + 1}`, { min: 1, max: MAX_QTY_PER_LINE });
    return {
      product: productId,
      qty,
      size: asString(src.size, "size", { max: 40 }),
      color: asString(src.color, "color", { max: 40 }),
      image: asString(src.image, "image", { max: 600 }),
      name: asString(src.name, "name", { max: 200 }),
    };
  });

  // ── Step 2: Load authoritative prices from the database ────────────────────
  const dbProducts = await Product.find({ _id: { $in: requested.map((r) => r.product) } });

  if (dbProducts.length !== new Set(requested.map((r) => String(r.product))).size) {
    const err = new Error("One or more items in your cart no longer exist");
    err.status = 400;
    throw err;
  }

  const verifiedItems = requested.map((line) => {
    const db = dbProducts.find((p) => p._id.equals(line.product));
    if (!db) {
      const err = new Error("One or more items in your cart no longer exist");
      err.status = 400;
      throw err;
    }
    // A sold-out product must never reach checkout, whatever the client thinks.
    if (db.oversold || db.countInStock < line.qty) {
      const available = Math.max(0, db.countInStock);
      throw new OutOfStockError(db.name, available);
    }

    return {
      name: db.name,
      qty: line.qty,
      image: line.image || db.image,
      // ALWAYS the database price — never the client's
      price: effectiveUnitPrice(db),
      product: db._id,
      size: line.size,
      color: line.color,
      // Populated so returns can be reconciled against the catalogue later.
      sku: db.sku || "",
      specsSnapshot: {
        fabric: db.specs?.fabric || "",
        lengthMeters: db.specs?.lengthMeters ?? null,
        widthInches: db.specs?.widthInches ?? null,
        blousePieceIncluded: Boolean(db.specs?.blousePieceIncluded),
        blousePieceMeters: db.specs?.blousePieceMeters ?? null,
        weave: db.specs?.weave || "",
        zariType: db.specs?.zariType || "",
      },
    };
  });

  const itemsPrice = verifiedItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const categories = [...new Set(dbProducts.map((p) => p.category))];

  // ── Step 3: Coupon — one source of truth, never silently ignored ──────────
  // Previously this called a hardcoded array while the frontend validated
  // against the Coupon collection, so an admin-created coupon displayed
  // "you're saving ₹400" and was then dropped: the customer paid full price.
  let couponDiscount = 0;
  let appliedCoupon = null;
  let reservedCoupon = null;

  const rawCouponCode = asString(body.couponCode, "coupon code", { max: 40 });
  if (rawCouponCode) {
    const result = await evaluateCoupon(rawCouponCode, {
      subtotal: itemsPrice,
      userId: req.user._id,
      categories,
    });
    if (!result.valid) {
      // Fail loudly. Silently charging full price is how you get chargebacks.
      const err = new Error(result.message || "That coupon code can't be used");
      err.status = 400;
      throw err;
    }
    couponDiscount = result.discount;
    appliedCoupon = result.coupon;
  }

  // ── Step 4: COD eligibility (bounds RTO exposure without killing COD volume)
  let codBlocked = false;
  if (paymentMethod === "COD") {
    codBlocked = await hasElevatedReturnRate(req.user._id, COD_POLICY.maxCustomerReturnRate);
  }
  const codCheck = codEligibility({
    totalPrice: Math.max(0, itemsPrice - couponDiscount),
    postalCode: shippingAddress.postalCode,
    codBlocked,
  });
  if (paymentMethod === "COD" && !codCheck.eligible) {
    const err = new Error(codCheck.reason);
    err.status = 400;
    throw err;
  }

  // ── Step 5: Authoritative totals ───────────────────────────────────────────
  const { shipping: shippingPrice, total: totalPrice } = calculateOrderTotals(
    itemsPrice,
    couponDiscount,
    shippingMethod.id
  );
  const eta = deliveryEstimate(shippingMethod.id);

  const initialStatus = paymentMethod === "COD" ? "Confirmed" : "Pending Payment";

  // ── Step 6: Persist atomically ─────────────────────────────────────────────
  // Stock decrement + order insert + coupon redemption must all succeed or all
  // roll back. Previously stock was never decremented at all, so a product with
  // countInStock 1 accepted unlimited orders.
  const doc = {
    user: req.user._id,
    orderItems: verifiedItems,
    shippingAddress,
    billingAddress:
      body.billingAddress && body.billingAddress.sameAsShipping === false
        ? { ...parseAddress(body.billingAddress, "billing address"), sameAsShipping: false }
        : { sameAsShipping: true },
    paymentMethod,
    itemsPrice,
    shippingPrice,
    taxPrice: 0,
    shippingMethod: shippingMethod.id,
    shippingMethodLabel: shippingMethod.label,
    estimatedDelivery: eta,
    discountPrice: couponDiscount,
    couponCode: appliedCoupon?.code || "",
    couponDiscount,
    totalPrice,
    orderNotes: asText(body.orderNotes, "order notes", 2000),
    isGift: Boolean(body.isGift),
    giftNote: asText(body.giftNote, "gift note", 500),
    giftWrap: Boolean(body.giftWrap),
    marketingOptIn: Boolean(body.marketingOptIn),
    status: initialStatus,
    isPaid: false,
    statusHistory: [
      {
        status: initialStatus,
        note:
          paymentMethod === "COD"
            ? `Order placed (Cash on Delivery) — arriving by ${eta}`
            : `Order placed, awaiting payment — arriving by ${eta}`,
        changedByName: req.user.name || "Customer",
        changedBy: req.user._id,
      },
    ],
    cod:
      paymentMethod === "COD"
        ? { status: "pending", remindersSent: 0, autoCancelAt: new Date(Date.now() + 24 * 3600 * 1000) }
        : { status: "not_applicable" },
  };

  let order;
  let reserved = false;

  try {
    const outcome = await withTransaction(async (session) => {
      // 1. Reserve stock atomically (conditional $gte guard)
      await decrementStock(
        verifiedItems.map((i) => ({ product: i.product, name: i.name, qty: i.qty })),
        session
      );

      // 2. Record the coupon redemption — also atomic, so a maxUses:1 coupon
      //    cannot be redeemed by two concurrent orders.
      if (appliedCoupon) {
        const ok = await reserveRedemption(appliedCoupon._id, req.user._id, session);
        if (!ok) {
          const err = new Error("That coupon has just been fully redeemed. Please remove it to continue.");
          err.status = 400;
          throw err;
        }
      }

      // 3. Insert the order
      const [created] = await Order.create([{ ...doc, stockDeducted: true }], {
        session,
      });
      return created;
    });
    order = outcome.result;
    reserved = true;
  } catch (err) {
    // Roll back a coupon reservation if the transaction body failed after it.
    if (reserved && appliedCoupon) {
      await releaseRedemption(appliedCoupon._id, req.user._id).catch(() => {});
    }
    throw err;
  }

  // ── Step 7: Post-commit side effects (never fail the order) ─────────────────
  recordAudit(req, {
    action: "order.create",
    entity: "Order",
    entityId: String(order._id),
    after: { totalPrice, itemsPrice, paymentMethod, items: verifiedItems.length },
    amount: totalPrice,
  });

  if (paymentMethod === "COD") {
    initiateCodConfirmation(order, req.user).catch((e) =>
      console.error("[cod] initiate failed:", e?.message || e)
    );
  } else {
    sendOrderConfirmation(order, req.user).catch((e) =>
      console.error("[email] order confirmation failed:", e?.message || e)
    );
  }

  await Promise.all(
    verifiedItems.map((item) =>
      Product.updateOne({ _id: item.product }, { $inc: { soldCount: item.qty } }).catch(() => {})
    )
  );

  res.status(201).json({
    ...order.toJSON(),
    checkout: {
      itemsPrice,
      shippingPrice,
      discountPrice: couponDiscount,
      totalPrice,
      shippingMethod: shippingMethod.id,
      shippingMethodLabel: shippingMethod.label,
      estimatedDelivery: eta,
      freeShippingThreshold: 2000,
    },
  });
});

// ─── My Orders ───────────────────────────────────────────────────────────────
// @route GET /api/orders/myorders
// @access Private
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .select("-paymentResult.razorpaySignature")
    .sort({ createdAt: -1 })
    .lean();

  res.json(orders);
});

// ─── Courier Tracking URL Helper ──────────────────────────────────────────────
export function generateTrackingUrl(courierName, trackingNumber) {
  if (!trackingNumber) return "";
  const c = String(courierName || "").toLowerCase().trim();
  const t = encodeURIComponent(String(trackingNumber).trim());

  if (c.includes("delhivery")) return `https://www.delhivery.com/track/package/${t}`;
  if (c.includes("bluedart") || c.includes("blue dart")) return `https://www.bluedart.com/tracking?trackNumber=${t}`;
  if (c.includes("dtdc")) return `https://www.dtdc.in/tracking/shipment-tracking.asp?strCnno=${t}`;
  if (c.includes("india post") || c.includes("speed post") || c.includes("post")) return `https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx`;
  if (c.includes("shiprocket")) return `https://shiprocket.co/tracking/${t}`;
  if (c.includes("ekart")) return `https://ekartlogistics.com/shipmenttrack/${t}`;
  if (c.includes("shadowfax")) return `https://tracker.shadowfax.in/#/track/${t}`;
  if (c.includes("xpressbees") || c.includes("xpress")) return `https://www.xpressbees.com/shipment/tracking?awbNo=${t}`;
  return "";
}

// ─── RTO Risk Evaluation Engine ───────────────────────────────────────────────
export function calculateRtoRisk(order) {
  const addr = order?.shippingAddress || {};
  const fullText = `${addr.address || ""} ${addr.landmark || ""}`.trim();
  const phone = String(addr.phone || "").replace(/\D/g, "");
  const isCod = order?.paymentMethod === "COD";
  const total = Number(order?.totalPrice || 0);

  let score = 0;
  const reasons = [];

  // 1. Phone number check (Indian mobile: 10 digits starting with 6, 7, 8, 9)
  if (!/^[6-9]\d{9}$/.test(phone)) {
    score += 35;
    reasons.push("Phone number may be invalid or incomplete");
  }

  // 2. Address completeness check
  if (fullText.length < 15) {
    score += 30;
    reasons.push("Shipping address is very short (missing house/flat or street details)");
  } else if (!/\d/.test(fullText)) {
    score += 15;
    reasons.push("No house, building, or plot number detected");
  }

  if (!addr.landmark || addr.landmark.trim().length < 3) {
    score += 10;
    reasons.push("No nearby landmark provided");
  }

  // 3. Payment method & value risk
  if (isCod) {
    score += 15;
    if (total >= 5000) {
      score += 20;
      reasons.push(`High-value COD order (₹${total.toLocaleString("en-IN")})`);
    }
    if (order?.cod?.status === "pending") {
      score += 10;
      reasons.push("COD order not yet confirmed by customer");
    }
  } else {
    // Prepaid orders have drastically lower RTO risk
    score = Math.max(0, score - 25);
  }

  let level = "LOW";
  if (score >= 50) level = "HIGH";
  else if (score >= 25) level = "MEDIUM";

  if (reasons.length === 0) {
    reasons.push(isCod ? "Complete address with landmark & verified phone" : "Prepaid order with verified address");
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    level,
    reasons,
    isCod,
  };
}

// ─── Get Order By ID ──────────────────────────────────────────────────────────
export const getOrderById = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "order id");
  const order = await Order.findById(id)
    .populate("user", "name email phone")
    .populate("statusHistory.changedBy", "name email");

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (!req.user.isAdmin && !order.user._id.equals(req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to view this order");
  }
  const orderObj = order.toObject ? order.toObject() : order;
  orderObj.rtoRisk = calculateRtoRisk(orderObj);
  res.json(orderObj);
});

// ─── Get All Orders (Admin) with filters ─────────────────────────────────────
export const getOrders = asyncHandler(async (req, res) => {
  const page = asInt(req.query.page, "page", { min: 1, max: 10000 });
  const limit = Math.min(asInt(req.query.limit, "limit", { min: 1, max: 200 }), 200);
  const skip = (page - 1) * limit;

  const filter = buildOrderFilter(req.query);

  if (req.query.search) {
    // Regex metacharacters are escaped — an unescaped `(a+)+$` from a query
    // string was passed straight into Mongo and could stall the query.
    const search = asString(req.query.search, "search", { max: 120 });
    const rx = safeContains(search);
    const matchingUsers = await User.find({ name: { $regex: rx } })
      .select("_id")
      .limit(500)
      .lean();
    const userIds = matchingUsers.map((u) => u._id);

    // An ObjectId can't be matched by regex on _id; match the human-readable
    // order number instead, which is what customers actually read off an invoice.
    const orderNumberRx = search.toUpperCase();
    filter.$or = [
      { orderNumber: { $regex: rx } },
      { user: { $in: userIds } },
      ...(/^[0-9a-fA-F]{6,24}$/.test(search)
        ? [{ _id: new mongoose.Types.ObjectId(search.padEnd(24, "0")) }]
        : [{ orderNumber: { $regex: new RegExp(orderNumberRx, "i") } }]),
    ];
  }

  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .populate("user", "id name email phone")
      .select("-paymentResult.razorpaySignature")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const enrichedOrders = orders.map((o) => ({
    ...o,
    rtoRisk: calculateRtoRisk(o),
  }));

  res.json({ orders: enrichedOrders, page, pages: Math.ceil(total / limit) || 1, total });
});

// ─── Update Order Status (Admin) ──────────────────────────────────────────────
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "order id");
  const status = asEnum(req.body?.status, ORDER_STATUSES, "status");
  const note = asText(req.body?.note, "note", 1000);
  const trackingNumber = asString(req.body?.trackingNumber, "tracking number", { max: 80 });
  const courierName = asString(req.body?.courierName, "courier", { max: 80 });
  const trackingUrl = asString(req.body?.trackingUrl, "tracking url", { max: 600 });

  const order = await Order.findById(id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const previous = order.status;

  // Uses the model's assertTransition, which — unlike the previous
  // `validNext.length > 0 &&` check — rejects every transition out of a
  // terminal status. A Cancelled order could previously be set to Delivered.
  Order.assertTransition(previous, status);

  order.status = status;

  if (status === "Delivered") {
    order.isDelivered = true;
    order.deliveredAt = new Date();
    // COD: money is collected at the door, so delivery settles the order.
    if (order.paymentMethod === "COD" && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = new Date();
    }
  }
  if (status === "Paid") {
    order.isPaid = true;
    order.paidAt = order.paidAt || new Date();
  }
  if (status === "Shipped") {
    order.shippedAt = new Date();
  }
  if (status === "Confirmed" && order.paymentMethod === "COD" && order.cod?.status === "pending") {
    order.cod.status = "confirmed";
    order.cod.confirmedAt = new Date();
  }

  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (courierName) order.courierName = courierName;
  if (trackingUrl) {
    order.trackingUrl = trackingUrl;
  } else if (trackingNumber && (courierName || order.courierName)) {
    order.trackingUrl = generateTrackingUrl(courierName || order.courierName, trackingNumber);
  }

  order.statusHistory.push({
    status,
    note: note || `Status updated to ${status}`,
    changedBy: req.user._id,
    changedByName: req.user.name || "Admin",
  });

  const updated = await order.save();

  recordAudit(req, {
    action: "order.status_update",
    entity: "Order",
    entityId: String(order._id),
    before: { status: previous },
    after: { status },
  });

  notifyStatusChange(updated, status);

  res.json(updated);
});

/** Fan out in-app + email notifications for a status change. */
async function notifyStatusChange(order, status) {
  const types = {
    Packed: "order_packed",
    Shipped: "order_shipped",
    "Out for Delivery": "order_out_for_delivery",
    Delivered: "order_delivered",
    Confirmed: "order_confirmed",
  };
  const messages = {
    Packed: ["Packed and ready", "Your order is packed and will ship shortly."],
    Shipped: ["On its way", `Shipped${order.courierName ? ` via ${order.courierName}` : ""}${order.trackingNumber ? ` · AWB ${order.trackingNumber}` : ""}.`],
    "Out for Delivery": ["Out for delivery today", "Our courier is on the way. Keep your payment ready if you chose Cash on Delivery."],
    Delivered: ["Delivered", "Your order has been delivered. If anything isn't right, tell us within 7 days."],
    Confirmed: ["Order confirmed", "We're getting your order ready."],
  };
  const msg = messages[status];
  if (!msg) return;

  await createNotification({
    userId: order.user,
    type: types[status],
    title: msg[0],
    message: msg[1],
    link: `/order/${order._id}`,
    order: order._id,
  }).catch(() => {});

  if (["Packed", "Shipped", "Out for Delivery", "Delivered"].includes(status)) {
    User.findById(order.user)
      .then((user) => user && sendOrderStatusUpdate(order, user, status))
      .catch(() => {});
  }
}

// ─── Mark Delivered (Admin) ───────────────────────────────────────────────────
export const markOrderDelivered = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "order id");
  const order = await Order.findById(id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Previously this set Delivered from ANY state, including Cancelled and
  // Refunded, resurrecting terminal orders.
  Order.assertTransition(order.status, "Delivered");

  order.isDelivered = true;
  order.deliveredAt = new Date();
  order.status = "Delivered";
  if (order.paymentMethod === "COD") {
    order.isPaid = true;
    order.paidAt = order.paidAt || new Date();
  }
  order.statusHistory.push({
    status: "Delivered",
    note: "Order delivered and cash collected",
    changedBy: req.user._id,
    changedByName: req.user.name || "Admin",
  });

  const updated = await order.save();
  recordAudit(req, {
    action: "order.deliver",
    entity: "Order",
    entityId: String(order._id),
    amount: updated.totalPrice,
  });
  notifyStatusChange(updated, "Delivered");
  res.json(updated);
});

// ─── Bulk Status Update (Admin) ───────────────────────────────────────────────
export const bulkUpdateStatus = asyncHandler(async (req, res) => {
  const { orderIds } = req.body || {};
  const status = asEnum(req.body?.status, ORDER_STATUSES, "status");

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    const err = new Error("Select at least one order");
    err.status = 400;
    throw err;
  }
  if (orderIds.length > 100) {
    const err = new Error("Update at most 100 orders at a time");
    err.status = 400;
    throw err;
  }

  const ids = orderIds.map((v) => asObjectId(v, "order id"));

  // Previously `updateMany` applied the status with no transition check at all.
  // Now each order is validated individually and invalid ones are reported
  // back rather than silently mangled.
  const orders = await Order.find({ _id: { $in: ids } }).select("status orderNumber paymentMethod totalPrice");
  const eligible = [];
  const skipped = [];

  for (const order of orders) {
    try {
      Order.assertTransition(order.status, status);
      eligible.push(order);
    } catch {
      skipped.push({ id: String(order._id), number: order.orderNumber, from: order.status });
    }
  }

  if (eligible.length === 0) {
    res.json({
      message: `No orders could be moved to "${status}"`,
      updated: 0,
      skipped,
    });
    return;
  }

  const eligibleIds = eligible.map((o) => o._id);
  const historyEntry = {
    status,
    note: `Bulk update to ${status}`,
    changedByName: req.user.name || "Admin",
    changedBy: req.user._id,
    updatedAt: new Date(),
  };

  const set = { status };
  const now = new Date();
  if (status === "Delivered") {
    set.isDelivered = true;
    set.deliveredAt = now;
  }
  if (status === "Paid") {
    set.isPaid = true;
    set.paidAt = now;
  }
  if (status === "Shipped") set.shippedAt = now;

  await Order.updateMany(
    { _id: { $in: eligibleIds }, status: { $in: eligible.map((o) => o.status) } },
    { $set: set, $push: { statusHistory: historyEntry } }
  );

  // COD orders settle on delivery, exactly as the single-order path does.
  if (status === "Delivered") {
    await Order.updateMany(
      { _id: { $in: eligibleIds }, paymentMethod: "COD", isPaid: false },
      { $set: { isPaid: true, paidAt: now } }
    );
  }

  recordAudit(req, {
    action: "order.bulk_status_update",
    entity: "Order",
    after: { status, count: eligibleIds.length },
    severity: "warning",
  });

  for (const order of eligible) notifyStatusChange(order, status);

  res.json({
    message: `${eligibleIds.length} order${eligibleIds.length === 1 ? "" : "s"} updated to ${status}${
      skipped.length ? `, ${skipped.length} skipped` : ""
    }`,
    updated: eligibleIds.length,
    skipped,
  });
});

// ─── Export Orders CSV (Admin) ────────────────────────────────────────────────
const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export const exportOrdersCSV = asyncHandler(async (req, res) => {
  const filter = buildOrderFilter(req.query);
  const orders = await Order.find(filter)
    .populate("user", "name email phone")
    .select("-paymentResult.razorpaySignature -statusHistory")
    .sort({ createdAt: -1 })
    .limit(10000)
    .lean();

  const headers = [
    "Order ID", "Order Number", "Date", "Customer", "Email", "Phone", "City",
    "PIN", "Items", "Subtotal", "Shipping", "Discount", "Coupon",
    "Total", "Payment Method", "Payment Status", "Order Status",
    "COD Status", "Courier", "Tracking",
  ];

  const rows = orders.map((o) => [
    o._id,
    o.orderNumber || "",
    new Date(o.createdAt).toLocaleDateString("en-IN"),
    o.user?.name || "Guest",
    o.user?.email || "",
    o.shippingAddress?.phone || "",
    o.shippingAddress?.city || "",
    o.shippingAddress?.postalCode || "",
    o.orderItems?.length || 0,
    o.itemsPrice,
    o.shippingPrice,
    o.discountPrice,
    o.couponCode || "",
    o.totalPrice,
    o.paymentMethod,
    o.isPaid ? "Paid" : "Unpaid",
    o.status,
    o.cod?.status || "",
    o.courierName || "",
    o.trackingNumber || "",
  ]);

  // A BOM makes Excel read the file as UTF-8 so ₹ renders correctly instead of
  // as mojibake — which matters for an Indian accounting export.
  const csv = "﻿" + [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="rk-orders-${Date.now()}.csv"`);
  res.send(csv);
});

// ─── Dashboard Stats (Admin) ──────────────────────────────────────────────────
export const getOrderStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [overallStats, todayStats, monthStats, statusBreakdown, totalUsers, codFunnel] =
    await Promise.all([
      Order.aggregate([
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: { $cond: ["$isPaid", "$totalPrice", 0] } },
            codOrders: { $sum: { $cond: [{ $eq: ["$paymentMethod", "COD"] }, 1, 0] } },
            codRevenue: {
              // `$eq` is an EXPRESSION inside an aggregation and takes exactly
              // two arguments: { $eq: [ <expr>, <expr> ] }. Writing
              // `{ $and: ["$paymentMethod", { $eq: "COD" }] }` throws
              // "Expression $eq takes exactly 2 arguments".
              $sum: {
                $cond: [
                  { $and: [{ $eq: ["$paymentMethod", "COD"] }, "$isPaid"] },
                  "$totalPrice",
                  0,
                ],
              },
            },
          },
        },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: today } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            revenue: { $sum: { $cond: ["$isPaid", "$totalPrice", 0] } },
          },
        },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: monthStart }, isPaid: true } },
        { $group: { _id: null, revenue: { $sum: "$totalPrice" } } },
      ]),
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      User.countDocuments({}),
      Order.aggregate([
        { $match: { paymentMethod: "COD" } },
        { $group: { _id: "$cod.status", count: { $sum: 1 } } },
      ]),
    ]);

  const overall = overallStats[0] || { totalOrders: 0, totalRevenue: 0, codOrders: 0, codRevenue: 0 };
  const todayData = todayStats[0] || { count: 0, revenue: 0 };
  const monthRevenue = monthStats[0]?.revenue || 0;

  const statusCounts = {};
  statusBreakdown.forEach((s) => {
    statusCounts[s._id] = s.count;
  });

  const codCounts = {};
  codFunnel.forEach((s) => {
    codCounts[s._id] = s.count;
  });

  const totalOrders = overall.totalOrders;
  const deliveredOrders = statusCounts["Delivered"] || 0;
  const cancelledOrders = statusCounts["Cancelled"] || 0;
  const returnedOrders = statusCounts["Returned"] || 0;
  const refundedOrders = statusCounts["Refunded"] || 0;
  const pendingOrders = (statusCounts["Pending Payment"] || 0) + (statusCounts["Paid"] || 0);
  const processingOrders =
    (statusCounts["Confirmed"] || 0) +
    (statusCounts["Packed"] || 0) +
    (statusCounts["Shipped"] || 0) +
    (statusCounts["Out for Delivery"] || 0);

  // COD confirmation rate and RTO are the two numbers that decide whether this
  // business is profitable. Ethnic wear runs 30-45% RTO; anything above ~30%
  // makes the category structurally loss-making at typical saree margins.
  const codPlaced = codCounts.pending + codCounts.confirmed + codCounts.cancelled + codCounts.expired || 0;
  const codConfirmed = codCounts.confirmed || 0;
  const codAutoReleased = codCounts.expired || 0;
  const codRto = codPlaced ? Math.round(((codAutoReleased + codCounts.cancelled) / codPlaced) * 100) : 0;

  res.json({
    totalOrders,
    totalRevenue: overall.totalRevenue,
    todayRevenue: todayData.revenue,
    todayOrders: todayData.count,
    monthRevenue,
    deliveredOrders,
    pendingOrders,
    processingOrders,
    cancelledOrders,
    returnedOrders,
    refundedOrders,
    totalUsers,
    conversionRate: totalOrders ? Math.round((deliveredOrders / totalOrders) * 100) : 0,
    refundRate: totalOrders ? Math.round((refundedOrders / totalOrders) * 100) : 0,
    cancellationRate: totalOrders ? Math.round((cancelledOrders / totalOrders) * 100) : 0,
    returnRate: totalOrders ? Math.round((returnedOrders / totalOrders) * 100) : 0,
    cod: {
      placed: codPlaced,
      confirmed: codConfirmed,
      confirmationRate: codPlaced ? Math.round((codConfirmed / codPlaced) * 100) : 0,
      autoReleased: codAutoReleased,
      rtoRate: codRto,
      revenue: overall.codRevenue,
      orders: overall.codOrders,
    },
    statusCounts,
  });
});

// ─── Monthly Sales Stats ──────────────────────────────────────────────────────
export const getMonthlySalesStats = asyncHandler(async (req, res) => {
  const stats = await Order.aggregate([
    { $match: { isPaid: true } },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        revenue: { $sum: "$totalPrice" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    { $limit: 12 },
  ]);

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const result = stats.map((s) => ({
    month: `${months[s._id.month - 1]} ${s._id.year}`,
    revenue: s.revenue,
    orders: s.orders,
  }));
  res.json(result);
});

// ─── Coupons ──────────────────────────────────────────────────────────────────
// GET /api/orders/coupons — the list the checkout UI renders. Driven by the
// database, so what the customer sees is what will actually be honoured.
export const getAvailableCoupons = asyncHandler(async (req, res) => {
  const now = new Date();
  const coupons = await Coupon.find({
    isActive: true,
    expiresAt: { $gt: now },
    $or: [{ startDate: { $lte: now } }, { startDate: null }],
  })
    .sort({ minOrderAmount: 1 })
    .limit(40)
    .lean();

  const visible = coupons
    .filter((c) => c.maxUses == null || c.usedCount < c.maxUses)
    .map((c) => serializeCoupon(c, 0));

  res.json(visible);
});

// POST /api/orders/coupon/validate — preview a discount against server-known
// product prices. The frontend used to send its own orderAmount, which let the
// displayed discount and the charged discount disagree.
export const validateCouponCode = asyncHandler(async (req, res) => {
  const code = asString(req.body?.code, "coupon code", { max: 40 });
  if (!code) {
    const err = new Error("Enter a coupon code");
    err.status = 400;
    throw err;
  }

  // Prefer real cart contents when supplied, so the preview is authoritative.
  const orderItems = req.body?.orderItems;
  // `orderAmount` is optional when the cart is supplied — the frontend sends the
  // real line items precisely so the server can price them itself. Requiring
  // both would make the authoritative path unreachable.
  let subtotal = req.body?.orderAmount === undefined || req.body?.orderAmount === null
    ? 0
    : asNumber(req.body.orderAmount, "order amount", { min: 0, max: 10_000_000 });
  let categories = [];

  if (Array.isArray(orderItems) && orderItems.length > 0 && orderItems.length <= MAX_LINES_PER_ORDER) {
    const ids = orderItems.map((l) => {
      try {
        return asObjectId(asObject(l, "cart item").product || l._id, "product");
      } catch {
        return null;
      }
    }).filter(Boolean);

    if (ids.length > 0) {
      const products = await Product.find({ _id: { $in: ids } })
        .select("price discount category")
        .lean();
      if (products.length > 0) {
        subtotal = orderItems.reduce((sum, line) => {
          const id = asObject(line, "cart item").product || line._id;
          const qty = Math.min(Math.max(asInt(line.qty, "quantity", { min: 1, max: MAX_QTY_PER_LINE }), 1), MAX_QTY_PER_LINE);
          const match = products.find((p) => String(p._id) === String(id));
          return sum + (match ? effectiveUnitPrice(match) * qty : 0);
        }, 0);
        categories = [...new Set(products.map((p) => p.category))];
      }
    }
  }

  const result = await evaluateCoupon(code, { subtotal, userId: req.user._id, categories });

  if (!result.valid) {
    res.status(400).json({ message: result.message, reason: result.reason, valid: false });
    return;
  }

  res.json({
    valid: true,
    code: result.code,
    discountType: result.coupon.discountType,
    discountValue: result.coupon.discountValue,
    discount: result.discount,
    appliedTo: subtotal,
    description: result.description,
    message: result.message,
  });
});

// ─── Return / Refund System ───────────────────────────────────────────────────

/** Return window, measured from delivery. */
const RETURN_WINDOW_DAYS = 7;

export const createReturnRequest = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "order id");
  const order = await Order.findById(id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (!order.user.equals(req.user._id) && !req.user.isAdmin) {
    res.status(403);
    throw new Error("Not authorized");
  }
  if (order.status !== "Delivered") {
    const err = new Error("A return can only be raised once your order is delivered");
    err.status = 400;
    throw err;
  }

  const deliveredAt = order.deliveredAt || order.updatedAt;
  const daysSince = (Date.now() - new Date(deliveredAt).getTime()) / 86400000;
  if (daysSince > RETURN_WINDOW_DAYS) {
    const err = new Error(
      `Our return window is ${RETURN_WINDOW_DAYS} days from delivery. Please contact us and we'll do our best to help.`
    );
    err.status = 400;
    throw err;
  }

  // Previously `ReturnRequest.findOne({order})` then `create` — two round trips
  // with a gap, so two rapid taps both passed the check. `order` is now uniquely
  // indexed, which makes the duplicate impossible at the database level.
  const existing = await ReturnRequest.findOne({ order: order._id }).lean();
  if (existing) {
    const err = new Error("A return request already exists for this order");
    err.status = 400;
    throw err;
  }

  const reason = asEnum(
    req.body?.reason,
    ["Wrong size", "Wrong item received", "Damaged/Defective", "Not as described", "Colour different from photo", "Changed mind", "Other"],
    "reason"
  );
  const reasonDetail = asText(req.body?.reasonDetail, "reason detail", 2000);

  // Which lines are being returned. Partial returns were impossible before, so
  // one faulty item out of three forced a full refund (or no refund at all).
  const requestedLines = Array.isArray(req.body?.items) ? req.body.items : [];

  let lines;
  if (requestedLines.length > 0) {
    // When the customer named specific items, ONLY those items come back.
    // Mapping over every order line and defaulting the quantity to the full
    // amount would have pulled unrequested items into the return.
    lines = order.orderItems
      .map((i) => {
        const asked = requestedLines.find((r) => String(r.product) === String(i.product));
        if (!asked) return null;
        const qty = Math.min(Math.max(asInt(asked.qty ?? 1, "quantity", { min: 1, max: 99 }), 1), i.qty);
        return { product: i.product, name: i.name, qty };
      })
      .filter(Boolean);
  } else {
    lines = order.orderItems.map((i) => ({ product: i.product, name: i.name, qty: i.qty }));
  }

  if (lines.length === 0) {
    const err = new Error("Select at least one item to return");
    err.status = 400;
    throw err;
  }

  // Create the request and flip the order status together — previously the
  // request could be created while the order save failed, leaving a return on an
  // order still showing "Delivered", and blocking a retry.
  let returnReq;
  await withTransaction(async (session) => {
    // `create` returns an ARRAY when a session is in play, so destructure rather
    // than assigning the whole result — otherwise every downstream `_id` read is
    // `undefined`.
    const [created] = await ReturnRequest.create(
      [
        {
          order: order._id,
          user: order.user,
          reason,
          reasonDetail,
          status: "Pending",
          items: lines,
          timeline: [
            {
              status: "Pending",
              note: "Return request submitted",
              changedBy: req.user.name || "Customer",
            },
          ],
        },
      ],
      { session }
    );
    returnReq = created;

    await Order.updateOne(
      { _id: order._id },
      {
        $set: { status: "Returned" },
        $push: {
          statusHistory: {
            status: "Returned",
            note: `Return requested: ${reason}`,
            changedBy: req.user._id,
            changedByName: req.user.name || "Customer",
          },
        },
      },
      { session }
    );
  });

  recordAudit(req, {
    action: "return.request",
    entity: "ReturnRequest",
    entityId: String(returnReq._id),
    after: { order: String(order._id), reason, lines: lines.length },
  });

  await createNotification({
    userId: order.user,
    type: "return_update",
    title: "Return request received",
    message: `We've received your return request for ${order.orderNumber}. We'll review it and arrange a pickup within 24 hours.`,
    link: `/order/${order._id}`,
    order: order._id,
  });

  res.status(201).json(returnReq);
});

// @route GET /api/orders/returns  (admin)
export const getReturnRequests = asyncHandler(async (req, res) => {
  const page = asInt(req.query.page, "page", { min: 1, max: 10000 });
  const limit = Math.min(asInt(req.query.limit, "limit", { min: 1, max: 200 }), 200);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = asEnum(req.query.status, ["Pending","Approved","Rejected","Refunded","Restocked"], "status");

  const [total, returns] = await Promise.all([
    ReturnRequest.countDocuments(filter),
    ReturnRequest.find(filter)
      .populate("order", "orderNumber totalPrice paymentMethod createdAt shippingAddress")
      .populate("user", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  res.json({ returns, page, pages: Math.ceil(total / limit) || 1, total });
});

// @route GET /api/orders/:id/return
// @access Private (order owner or admin)
export const getReturnRequestByOrder = asyncHandler(async (req, res) => {
  const orderId = asObjectId(req.params.id, "order id");

  // Previously this endpoint only checked `protect` — any logged-in user could
  // iterate order IDs and read another customer's return reason, admin notes,
  // refund amount, name and email.
  const order = await Order.findById(orderId).select("user").lean();
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (!req.user.isAdmin && String(order.user) !== String(req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to view this return request");
  }

  const returnReq = await ReturnRequest.findOne({ order: orderId })
    .populate("user", "name email")
    .lean();

  res.json(returnReq || null);
});

// @route PUT /api/orders/returns/:returnId  (admin)
export const updateReturnRequest = asyncHandler(async (req, res) => {
  const returnId = asObjectId(req.params.returnId, "return id");
  const status = asEnum(
    req.body?.status,
    ["Pending", "Approved", "Rejected", "Refunded", "Restocked"],
    "status"
  );
  const adminNote = asText(req.body?.adminNote, "admin note", 2000);
  const refundAmountRaw = req.body?.refundAmount;

  const returnReq = await ReturnRequest.findById(returnId);
  if (!returnReq) {
    res.status(404);
    throw new Error("Return request not found");
  }

  const order = await Order.findById(returnReq.order);
  if (!order) {
    res.status(404);
    throw new Error("Related order not found");
  }

  // Refund must be validated against the order total — it was previously
  // admin-supplied with no bounds, so a negative or over-total amount could be
  // written straight onto the order and corrupt refund reporting.
  let refundAmount = null;
  if (refundAmountRaw !== undefined && refundAmountRaw !== null && refundAmountRaw !== "") {
    refundAmount = asNumber(refundAmountRaw, "refund amount", { min: 0, max: 1_000_000 });
    if (refundAmount > order.totalPrice) {
      const err = new Error(`Refund cannot exceed the order total of ₹${order.totalPrice.toLocaleString("en-IN")}`);
      err.status = 400;
      throw err;
    }
  }

  const previous = returnReq.status;
  returnReq.status = status;
  if (adminNote) returnReq.adminNote = adminNote;
  if (refundAmount !== null) returnReq.refundAmount = refundAmount;
  returnReq.timeline.push({
    status,
    note: adminNote || `Return ${status.toLowerCase()}`,
    changedBy: req.user.name || "Admin",
  });

  let gatewayRefund = null;

  // Refund path: restock + issue a real gateway refund + record the id.
  if (status === "Refunded") {
    const amount = refundAmount ?? returnReq.refundAmount ?? order.totalPrice;

    // Restock the returned lines. Previously `restocked = true` was set with no
    // Product write at all, so returned stock vanished permanently.
    if (!returnReq.restocked) {
      const toRestore = (returnReq.items?.length ? returnReq.items : order.orderItems).map((i) => ({
        product: i.product,
        qty: i.qty,
      }));
      try {
        await withTransaction(async (session) => {
          await restoreStock(toRestore, session);
          await Order.updateOne(
            { _id: order._id },
            { $set: { inventoryRestored: true } },
            { session }
          );
        });
        returnReq.restocked = true;
        if (!order.inventoryRestored) {
          order.inventoryRestored = true;
          for (const item of toRestore) {
            await Order.updateOne(
              { _id: order._id, "orderItems.product": item.product },
              { $set: { "orderItems.$.isRestocked": true } }
            );
          }
        }
      } catch (err) {
        console.error("[return] restock failed:", err?.message || err);
        returnReq.adminNote = `${returnReq.adminNote}\n[restock failed: ${err.message}]`.trim();
      }
    }

    // Issue an actual refund through the gateway for prepaid orders.
    if (order.isPaid && order.paymentMethod !== "COD" && order.paymentResult?.razorpayPaymentId) {
      gatewayRefund = await tryRefund({
        paymentId: order.paymentResult.razorpayPaymentId,
        amount,
        orderId: order._id,
        reason: `return_${returnReq._id}`,
      });
      order.refundStatus = gatewayRefund.ok ? "Refunded" : "Failed";
      if (gatewayRefund.ok) order.refundId = gatewayRefund.refundId;
      else order.refundNote = `Automatic refund failed (${gatewayRefund.reason}) — process manually`;
      returnReq.refundId = gatewayRefund.ok ? gatewayRefund.refundId : "";
    } else {
      // COD: money was never collected, so there is nothing to refund
      order.refundStatus = "Refunded";
    }

    order.refundAmount = amount;
    order.status = "Refunded";
    order.statusHistory.push({
      status: "Refunded",
      note: `Refund processed: ₹${amount.toLocaleString("en-IN")}${gatewayRefund?.ok ? ` (${gatewayRefund.refundId})` : ""}`,
      changedBy: req.user._id,
      changedByName: req.user.name || "Admin",
    });
    await order.save();

    sendRefundEmail(order, await User.findById(order.user), amount).catch(() => {});
  }

  if (status === "Rejected") {
    // Put the goods back in "delivered" — the customer keeps them.
    Order.assertTransition(order.status, "Delivered");
    order.status = "Delivered";
    order.statusHistory.push({
      status: "Delivered",
      note: `Return rejected: ${adminNote || "does not meet our return policy"}`,
      changedBy: req.user._id,
      changedByName: req.user.name || "Admin",
    });
    await order.save();
  }

  const updated = await returnReq.save();

  recordAudit(req, {
    action: "return.update",
    entity: "ReturnRequest",
    entityId: String(returnReq._id),
    before: { status: previous },
    after: { status, refundAmount },
    amount: refundAmount ?? undefined,
    severity: status === "Refunded" ? "critical" : "warning",
    note: gatewayRefund?.ok ? `gateway refund ${gatewayRefund.refundId}` : undefined,
  });

  await createNotification({
    userId: order.user,
    type: "return_update",
    title: `Return ${status.toLowerCase()}`,
    message:
      status === "Refunded"
        ? `Your refund of ₹${(refundAmount ?? order.totalPrice).toLocaleString("en-IN")} has been processed. It reaches your payment method within 24 hours.`
        : `Your return request for ${order.orderNumber} is now ${status.toLowerCase()}.${adminNote ? ` ${adminNote}` : ""}`,
    link: `/order/${order._id}`,
    order: order._id,
  });

  res.json({ ...updated.toJSON(), gatewayRefund });
});

// ─── Cancel Order (Customer) ──────────────────────────────────────────────────
export const cancelOrder = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "order id");
  const order = await Order.findById(id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (!order.user.equals(req.user._id) && !req.user.isAdmin) {
    res.status(403);
    throw new Error("Not authorized to cancel this order");
  }

  // Previously this used a hardcoded list that ignored the transition map, and
  // crucially cancelled "Confirmed" orders — which is the status every paid
  // Razorpay order landed in. Customers could pay ₹5,000, cancel immediately,
  // and keep the money with no refund path. Repeatable.
  Order.assertTransition(order.status, "Cancelled");

  const wasPaid = order.isPaid && order.paymentMethod !== "COD";
  const paymentId = order.paymentResult?.razorpayPaymentId;

  // Restore stock
  if (order.stockDeducted && !order.inventoryRestored) {
    try {
      await withTransaction(async (session) => {
        await restoreStock(order.orderItems, session);
        await Order.updateOne({ _id: order._id }, { $set: { inventoryRestored: true } }, { session });
      });
      order.inventoryRestored = true;
    } catch (err) {
      console.error("[cancel] restock failed:", err?.message || err);
    }
  }

  // Release the coupon slot so the customer isn't locked out of it
  if (order.couponCode) {
    const coupon = await Coupon.findOne({ code: order.couponCode });
    if (coupon) {
      await releaseRedemption(coupon._id, order.user).catch(() => {});
    }
  }

  order.status = "Cancelled";
  order.cod = { ...order.cod.toObject?.() ?? order.cod, status: order.paymentMethod === "COD" ? "cancelled" : "not_applicable" };
  order.statusHistory.push({
    status: "Cancelled",
    note: wasPaid ? "Cancelled by customer — refund initiated" : "Cancelled by customer",
    changedByName: req.user.name || "Customer",
    changedBy: req.user._id,
  });

  let refund = null;
  if (wasPaid) {
    refund = await tryRefund({
      paymentId,
      amount: order.totalPrice,
      orderId: order._id,
      reason: "customer_cancellation",
    });
    order.refundStatus = refund.ok ? "Refunded" : "Failed";
    order.refundAmount = refund.ok ? order.totalPrice : 0;
    if (refund.ok) order.refundId = refund.refundId;
    else order.refundNote = `Automatic refund failed (${refund.reason}) — process manually`;
    if (refund.ok) {
      order.statusHistory[order.statusHistory.length - 1].note += ` · refund ${refund.refundId}`;
    }
  } else {
    order.refundStatus = order.refundStatus || "None";
  }

  const cancelled = await order.save();

  recordAudit(req, {
    action: "order.cancel",
    entity: "Order",
    entityId: String(order._id),
    after: { refund: refund?.ok ? refund.refundId : refund?.reason || "none" },
    amount: order.totalPrice,
    severity: wasPaid ? "critical" : "info",
  });

  await createNotification({
    userId: order.user,
    type: "order_cancelled",
    title: refund?.ok ? "Order cancelled — refund initiated" : "Order cancelled",
    message: refund?.ok
      ? `Order ${order.orderNumber} is cancelled and ₹${order.totalPrice.toLocaleString("en-IN")} is on its way back to your payment method.`
      : `Order ${order.orderNumber} is cancelled. No payment was taken.`,
    link: `/order/${order._id}`,
    order: order._id,
  });

  sendCancellationEmail(cancelled, await User.findById(order.user)).catch(() => {});

  res.json({
    message: "Order cancelled successfully",
    refund: refund?.ok
      ? { status: "initiated", amount: order.totalPrice, refundId: refund.refundId }
      : wasPaid
        ? { status: "pending_manual", message: "Your order is cancelled. Our team will process your refund within 24 hours." }
        : null,
    order: cancelled,
  });
});

// ─── COD confirmation (public reply endpoint) ─────────────────────────────────
// @route POST /api/orders/:id/cod-confirm
// @access Private (order owner)
export const confirmCodOrder = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "order id");
  const action = asEnum(req.body?.action, ["confirm", "cancel"], "action");

  const order = await Order.findById(id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (!order.user.equals(req.user._id)) {
    res.status(403);
    throw new Error("Not authorized");
  }
  if (order.paymentMethod !== "COD") {
    res.status(400);
    throw new Error("This order was paid online");
  }

  if (action === "cancel") return cancelOrderLogic(req, res, order);

  if (order.cod?.status === "confirmed") {
    return res.json({ message: "This order is already confirmed", cod: order.cod });
  }
  if (order.cod?.status && order.cod.status !== "pending") {
    res.status(400);
    throw new Error(`This order is already ${order.cod.status}`);
  }

  order.cod = {
    ...(order.cod?.toObject?.() ?? order.cod ?? {}),
    status: "confirmed",
    confirmedAt: new Date(),
    confirmedVia: "web",
  };
  order.statusHistory.push({
    status: order.status,
    note: "Customer confirmed their Cash on Delivery order",
    changedByName: req.user.name || "Customer",
    changedBy: req.user._id,
  });
  await order.save();

  recordAudit(req, {
    action: "order.cod_confirm",
    entity: "Order",
    entityId: String(order._id),
  });

  res.json({ message: "Thank you! Your order is confirmed.", cod: order.cod });
});

/** Shared cancel logic so both the cancel endpoint and COD-cancel use it. */
async function cancelOrderLogic(req, res, order) {
  Order.assertTransition(order.status, "Cancelled");
  const wasPaid = order.isPaid && order.paymentMethod !== "COD";
  const paymentId = order.paymentResult?.razorpayPaymentId;

  if (order.stockDeducted && !order.inventoryRestored) {
    await withTransaction(async (session) => {
      await restoreStock(order.orderItems, session);
      await Order.updateOne({ _id: order._id }, { $set: { inventoryRestored: true } }, { session });
    }).catch((err) => console.error("[cod-cancel] restock failed:", err?.message || err));
    order.inventoryRestored = true;
  }

  if (order.couponCode) {
    const coupon = await Coupon.findOne({ code: order.couponCode });
    if (coupon) await releaseRedemption(coupon._id, order.user).catch(() => {});
  }

  order.status = "Cancelled";
  order.cod = { ...(order.cod?.toObject?.() ?? {}), status: "cancelled" };
  order.statusHistory.push({
    status: "Cancelled",
    note: "Cancelled by customer via order confirmation",
    changedByName: req.user.name || "Customer",
    changedBy: req.user._id,
  });

  let refund = null;
  if (wasPaid) {
    refund = await tryRefund({ paymentId, amount: order.totalPrice, orderId: order._id, reason: "cod_confirm_cancel" });
    order.refundStatus = refund.ok ? "Refunded" : "Failed";
    if (refund.ok) order.refundId = refund.refundId;
  }

  await order.save();
  await createNotification({
    userId: order.user,
    type: "order_cancelled",
    title: "Order cancelled",
    message: `Order ${order.orderNumber} is cancelled as requested. No payment is due.`,
    link: `/order/${order._id}`,
    order: order._id,
  });

  res.json({ message: "Order cancelled.", order });
}

// ─── Shipping quote (public, drives the checkout trust panel) ─────────────────
// @route POST /api/orders/quote
// @access Public
export const getShippingQuote = asyncHandler(async (req, res) => {
  const postalCode = asString(req.body?.postalCode, "PIN code", { max: 6 }).replace(/\D/g, "");
  const subtotal = asNumber(req.body?.subtotal, "subtotal", { min: 0, max: 10_000_000 });
  const methodId = asString(req.body?.shippingMethod, "shipping method", { max: 30 }) || "standard";

  const options = ["standard", "express"].map((id) => {
    const method = getShippingMethod(id);
    const shipping = subtotal >= method.freeAbove ? 0 : method.price;
    return {
      id: method.id,
      label: method.label,
      daysLabel: method.daysLabel,
      description: method.description,
      price: shipping,
      freeAbove: method.freeAbove,
      estimatedDelivery: deliveryEstimate(method.id),
    };
  });

  const cod = codEligibility({ totalPrice: subtotal, postalCode });

  res.json({
    options,
    selected: options.find((o) => o.id === methodId) || options[0],
    cod,
    serviceable: postalCode.length === 6 ? /^\d{6}$/.test(postalCode) : null,
  });
});
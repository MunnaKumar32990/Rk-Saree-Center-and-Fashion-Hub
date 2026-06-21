import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import ReturnRequest from "../models/ReturnRequest.js";
import asyncHandler from "../utils/asyncHandler.js";
import { validateCoupon, COUPONS } from "../utils/coupons.js";

// ─── Helper ──────────────────────────────────────────────────────────────────
const buildOrderFilter = (query) => {
  const filter = {};

  if (query.status) filter.status = query.status;

  if (query.paymentStatus === "paid") filter.isPaid = true;
  else if (query.paymentStatus === "unpaid") filter.isPaid = false;

  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) {
      const to = new Date(query.dateTo);
      to.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = to;
    }
  }

  if (query.minPrice || query.maxPrice) {
    filter.totalPrice = {};
    if (query.minPrice) filter.totalPrice.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.totalPrice.$lte = Number(query.maxPrice);
  }

  return filter;
};

// ─── Pricing constants (must match frontend/src/utils/pricing.js) ────────────
const FREE_SHIPPING_THRESHOLD = 2000;
const SHIPPING_COST = 100;

const calcShipping = (subtotal) => (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST);

// ─── Create Order ─────────────────────────────────────────────────────────────
// @route POST /api/orders
// @access Private
export const addOrderItems = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    billingAddress,
    paymentMethod,
    couponCode,
    couponDiscount: clientCouponDiscount,
    orderNotes,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error("No order items");
  }

  // ── Step 1: Fetch real prices from DB ──────────────────────────────────────
  const productIds = orderItems.map((item) => item.product || item._id);
  const dbProducts = await Product.find({ _id: { $in: productIds } });

  if (dbProducts.length !== productIds.length) {
    res.status(400);
    throw new Error("One or more products not found");
  }

  // ── Step 2: Build verified order items with server-side prices ──────────────
  const verifiedItems = orderItems.map((item) => {
    const dbProduct = dbProducts.find(
      (p) => p._id.toString() === (item.product || item._id)?.toString()
    );
    if (!dbProduct) throw new Error(`Product not found: ${item.name}`);
    if (dbProduct.countInStock < item.qty) {
      throw new Error(`Insufficient stock for: ${dbProduct.name}`);
    }

    // Use DB price — always, never the client's price
    const unitPrice = dbProduct.discount > 0
      ? Math.round(dbProduct.price * (1 - dbProduct.discount / 100))
      : dbProduct.price;

    return {
      name: dbProduct.name,
      qty: item.qty,
      image: item.image || dbProduct.image,
      price: unitPrice,
      product: dbProduct._id,
      size: item.size || "",
      color: item.color || "",
    };
  });

  // ── Step 3: Server-side totals ─────────────────────────────────────────────
  const itemsPrice = verifiedItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingPrice = calcShipping(itemsPrice);

  // Validate coupon discount if applied
  let couponDiscount = 0;
  if (couponCode && clientCouponDiscount > 0) {
    // Cap discount at order total — can't go negative
    couponDiscount = Math.min(clientCouponDiscount, itemsPrice);
  }

  const taxPrice = 0;
  const totalPrice = Math.max(0, itemsPrice + shippingPrice + taxPrice - couponDiscount);

  const initialStatus = paymentMethod === "COD" ? "Confirmed" : "Pending Payment";

  const order = await Order.create({
    user: req.user._id,
    orderItems: verifiedItems,
    shippingAddress,
    billingAddress: billingAddress || { sameAsShipping: true },
    paymentMethod,
    itemsPrice,
    shippingPrice,
    taxPrice,
    discountPrice: couponDiscount,
    couponCode: couponCode || "",
    couponDiscount,
    totalPrice,
    orderNotes: orderNotes || "",
    status: initialStatus,
    isPaid: false,
    statusHistory: [
      {
        status: initialStatus,
        note: paymentMethod === "COD"
          ? "Order placed (Cash on Delivery)"
          : "Order placed, awaiting payment",
        changedByName: req.user.name || "Customer",
        changedBy: req.user._id,
      },
    ],
  });

  res.status(201).json(order);
});


// ─── My Orders ───────────────────────────────────────────────────────────────
// @route GET /api/orders/myorders
// @access Private
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

// ─── Get Order By ID ──────────────────────────────────────────────────────────
// @route GET /api/orders/:id
// @access Private
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name email phone")
    .populate("statusHistory.changedBy", "name email");

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (!req.user.isAdmin && order.user._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to view this order");
  }

  res.json(order);
});

// ─── Get All Orders (Admin) with filters ─────────────────────────────────────
// @route GET /api/orders
// @access Admin
export const getOrders = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = buildOrderFilter(req.query);

  // Search by order ID fragment or customer name
  if (req.query.search) {
    const search = req.query.search.trim();
    // Find users matching the name search
    const matchingUsers = await User.find({
      name: { $regex: search, $options: "i" },
    }).select("_id");
    const userIds = matchingUsers.map((u) => u._id);

    filter.$or = [
      { _id: { $regex: search, $options: "i" } },
      { user: { $in: userIds } },
    ];
  }

  const [total, orders] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .populate("user", "id name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);

  res.json({ orders, page, pages: Math.ceil(total / limit), total });
});

// ─── Update to Paid (Razorpay callback) ──────────────────────────────────────
// @route PUT /api/orders/:id/pay
// @access Private
export const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.status = "Paid";
  order.paymentResult = {
    razorpayOrderId: req.body.razorpayOrderId,
    razorpayPaymentId: req.body.razorpayPaymentId,
    razorpaySignature: req.body.razorpaySignature,
    transactionId: req.body.razorpayPaymentId || req.body.transactionId,
    paymentGateway: "Razorpay",
    status: "COMPLETED",
    updateTime: new Date().toISOString(),
  };
  order.statusHistory.push({
    status: "Paid",
    note: "Payment received via Razorpay",
    changedBy: req.user._id,
    changedByName: "System",
  });

  const updatedOrder = await order.save();
  res.json(updatedOrder);
});

// ─── Update Order Status (Admin) ──────────────────────────────────────────────
// @route PUT /api/orders/:id/status
// @access Admin
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note, trackingNumber, courierName, trackingUrl } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Validate transition
  const validNext = Order.VALID_TRANSITIONS[order.status] || [];
  if (validNext.length > 0 && !validNext.includes(status)) {
    res.status(400);
    throw new Error(
      `Invalid status transition: ${order.status} → ${status}. Allowed: ${validNext.join(", ")}`
    );
  }

  order.status = status;

  if (status === "Delivered") {
    order.isDelivered = true;
    order.deliveredAt = Date.now();
    if (order.paymentMethod === "COD") {
      order.isPaid = true;
      order.paidAt = Date.now();
    }
  }
  if (status === "Paid") {
    order.isPaid = true;
    order.paidAt = Date.now();
  }
  if (status === "Refunded") {
    order.refundStatus = "Refunded";
  }

  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (courierName) order.courierName = courierName;
  if (trackingUrl) order.trackingUrl = trackingUrl;

  order.statusHistory.push({
    status,
    note: note || `Status updated to ${status}`,
    changedBy: req.user._id,
    changedByName: req.user.name || "Admin",
  });

  const updatedOrder = await order.save();
  res.json(updatedOrder);
});

// ─── Mark Delivered (Admin) ───────────────────────────────────────────────────
// @route PUT /api/orders/:id/deliver
// @access Admin
export const markOrderDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.isDelivered = true;
  order.deliveredAt = Date.now();
  order.status = "Delivered";
  if (order.paymentMethod === "COD") {
    order.isPaid = true;
    order.paidAt = Date.now();
  }
  order.statusHistory.push({
    status: "Delivered",
    note: "Order delivered to customer",
    changedBy: req.user._id,
    changedByName: req.user.name || "Admin",
  });

  const updatedOrder = await order.save();
  res.json(updatedOrder);
});

// ─── Bulk Status Update (Admin) ───────────────────────────────────────────────
// @route PUT /api/orders/bulk-status
// @access Admin
export const bulkUpdateStatus = asyncHandler(async (req, res) => {
  const { orderIds, status } = req.body;

  if (!orderIds || orderIds.length === 0 || !status) {
    res.status(400);
    throw new Error("orderIds[] and status are required");
  }

  const historyEntry = {
    status,
    note: `Bulk status update to ${status}`,
    changedByName: req.user.name || "Admin",
    changedBy: req.user._id,
    updatedAt: new Date(),
  };

  let modifiedCount = 0;

  if (status === "Delivered") {
    // Update COD orders: mark delivered and paid
    const codResult = await Order.updateMany(
      { _id: { $in: orderIds }, paymentMethod: "COD" },
      {
        $set: {
          status,
          isDelivered: true,
          deliveredAt: new Date(),
          isPaid: true,
          paidAt: new Date(),
        },
        $push: { statusHistory: historyEntry },
      }
    );

    // Update non-COD orders: mark delivered
    const nonCodResult = await Order.updateMany(
      { _id: { $in: orderIds }, paymentMethod: { $ne: "COD" } },
      {
        $set: {
          status,
          isDelivered: true,
          deliveredAt: new Date(),
        },
        $push: { statusHistory: historyEntry },
      }
    );

    modifiedCount = codResult.modifiedCount + nonCodResult.modifiedCount;
  } else {
    // Other status updates
    const update = {
      $set: { status },
      $push: { statusHistory: historyEntry },
    };
    if (status === "Paid") {
      update.$set.isPaid = true;
      update.$set.paidAt = new Date();
    }
    const result = await Order.updateMany({ _id: { $in: orderIds } }, update);
    modifiedCount = result.modifiedCount;
  }

  res.json({ message: `${modifiedCount} orders updated to ${status}` });
});

// ─── Export Orders CSV (Admin) ────────────────────────────────────────────────
// @route GET /api/orders/export-csv
// @access Admin
export const exportOrdersCSV = asyncHandler(async (req, res) => {
  const filter = buildOrderFilter(req.query);
  const orders = await Order.find(filter)
    .populate("user", "name email phone")
    .sort({ createdAt: -1 })
    .limit(5000);

  const headers = [
    "Order ID",
    "Date",
    "Customer",
    "Email",
    "Phone",
    "Items",
    "Total (₹)",
    "Payment Method",
    "Payment Status",
    "Order Status",
    "Coupon",
    "Discount",
    "Tracking",
  ];

  const rows = orders.map((o) => [
    o._id,
    new Date(o.createdAt).toLocaleDateString("en-IN"),
    o.user?.name || "Guest",
    o.user?.email || "",
    o.shippingAddress?.phone || "",
    o.orderItems?.length || 0,
    o.totalPrice,
    o.paymentMethod,
    o.isPaid ? "Paid" : "Unpaid",
    o.status,
    o.couponCode || "",
    o.couponDiscount || 0,
    o.trackingNumber || "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="orders-${Date.now()}.csv"`
  );
  res.send(csvContent);
});

// ─── Dashboard Stats (Admin) ──────────────────────────────────────────────────
// @route GET /api/orders/stats
// @access Admin
export const getOrderStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    allOrders,
    paidOrders,
    todayOrders,
    monthOrders,
    totalUsers,
  ] = await Promise.all([
    Order.find({}),
    Order.find({ isPaid: true }),
    Order.find({ createdAt: { $gte: today } }),
    Order.find({ createdAt: { $gte: monthStart }, isPaid: true }),
    User.countDocuments({}),
  ]);

  const totalOrders = allOrders.length;
  const totalRevenue = paidOrders.reduce((acc, o) => acc + o.totalPrice, 0);
  const todayRevenue = todayOrders
    .filter((o) => o.isPaid)
    .reduce((acc, o) => acc + o.totalPrice, 0);
  const monthRevenue = monthOrders.reduce((acc, o) => acc + o.totalPrice, 0);

  const statusCounts = {};
  allOrders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });

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

  const conversionRate =
    totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;
  const refundRate =
    totalOrders > 0 ? Math.round((refundedOrders / totalOrders) * 100) : 0;
  const cancellationRate =
    totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0;

  res.json({
    totalOrders,
    totalRevenue,
    todayRevenue,
    todayOrders: todayOrders.length,
    monthRevenue,
    deliveredOrders,
    pendingOrders,
    processingOrders,
    cancelledOrders,
    returnedOrders,
    refundedOrders,
    totalUsers,
    conversionRate,
    refundRate,
    cancellationRate,
    statusCounts,
  });
});

// ─── Monthly Sales Stats ──────────────────────────────────────────────────────
// @route GET /api/orders/monthly-stats
// @access Admin
export const getMonthlySalesStats = asyncHandler(async (req, res) => {
  const stats = await Order.aggregate([
    { $match: { isPaid: true } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        revenue: { $sum: "$totalPrice" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    { $limit: 12 },
  ]);

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const result = stats.map((s) => ({
    month: `${months[s._id.month - 1]} ${s._id.year}`,
    revenue: s.revenue,
    orders: s.orders,
  }));

  res.json(result);
});

// ─── Create Razorpay Order ────────────────────────────────────────────────────
// @route POST /api/orders/razorpay
// @access Private
export const createRazorpayOrder = asyncHandler(async (req, res) => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
    res.status(503);
    throw new Error("Payment gateway not configured");
  }

  const Razorpay = (await import("razorpay")).default;
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
  });

  const { amount } = req.body;
  const options = {
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  };

  const order = await razorpay.orders.create(options);
  res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
});

// ─── Coupon Routes ────────────────────────────────────────────────────────────
export const validateCouponCode = asyncHandler(async (req, res) => {
  const { code, orderTotal } = req.body;

  if (!code) {
    res.status(400);
    throw new Error("Coupon code is required");
  }

  const result = validateCoupon(code, Number(orderTotal) || 0);

  if (!result.valid) {
    res.status(400).json({ message: result.message });
    return;
  }

  res.json({
    valid: true,
    code: result.coupon.code,
    type: result.coupon.type,
    value: result.coupon.value,
    discount: result.discount,
    description: result.message,
  });
});

export const getAvailableCoupons = asyncHandler(async (req, res) => {
  const now = new Date();
  const visible = COUPONS
    .filter((c) => c.expiry > now)
    .map((c) => ({
      code: c.code,
      description: c.description,
      minOrder: c.minOrder,
      type: c.type,
      value: c.value,
    }));
  res.json(visible);
});

// ─── Return / Refund System ───────────────────────────────────────────────────

// @route POST /api/orders/:id/return
// @access Private (customer)
export const createReturnRequest = asyncHandler(async (req, res) => {
  const { reason, reasonDetail } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }

  if (order.status !== "Delivered") {
    res.status(400);
    throw new Error("Return requests can only be raised for delivered orders");
  }

  const existing = await ReturnRequest.findOne({ order: order._id });
  if (existing) {
    res.status(400);
    throw new Error("A return request already exists for this order");
  }

  const returnReq = await ReturnRequest.create({
    order: order._id,
    user: req.user._id,
    reason,
    reasonDetail: reasonDetail || "",
    status: "Pending",
    timeline: [
      {
        status: "Pending",
        note: "Return request submitted by customer",
        changedBy: req.user.name || "Customer",
      },
    ],
  });

  // Update order status
  order.status = "Returned";
  order.statusHistory.push({
    status: "Returned",
    note: `Return requested: ${reason}`,
    changedBy: req.user._id,
    changedByName: req.user.name || "Customer",
  });
  await order.save();

  res.status(201).json(returnReq);
});

// @route GET /api/orders/returns
// @access Admin
export const getReturnRequests = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [total, returns] = await Promise.all([
    ReturnRequest.countDocuments(filter),
    ReturnRequest.find(filter)
      .populate("order", "_id totalPrice createdAt")
      .populate("user", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);

  res.json({ returns, page, pages: Math.ceil(total / limit), total });
});

// @route GET /api/orders/:id/return
// @access Private
export const getReturnRequestByOrder = asyncHandler(async (req, res) => {
  const returnReq = await ReturnRequest.findOne({ order: req.params.id })
    .populate("user", "name email");

  res.json(returnReq || null);
});

// @route PUT /api/orders/returns/:returnId
// @access Admin
export const updateReturnRequest = asyncHandler(async (req, res) => {
  const { status, adminNote, refundAmount } = req.body;
  const returnReq = await ReturnRequest.findById(req.params.returnId);

  if (!returnReq) {
    res.status(404);
    throw new Error("Return request not found");
  }

  returnReq.status = status;
  if (adminNote) returnReq.adminNote = adminNote;
  if (refundAmount !== undefined) returnReq.refundAmount = refundAmount;

  returnReq.timeline.push({
    status,
    note: adminNote || `Return ${status.toLowerCase()} by admin`,
    changedBy: req.user.name || "Admin",
  });

  // If approved → update order to Refunded
  if (status === "Refunded") {
    returnReq.restocked = true;
    const order = await Order.findById(returnReq.order);
    if (order) {
      order.status = "Refunded";
      order.refundStatus = "Refunded";
      order.refundAmount = refundAmount || order.totalPrice;
      order.statusHistory.push({
        status: "Refunded",
        note: `Refund processed: ₹${refundAmount || order.totalPrice}`,
        changedBy: req.user._id,
        changedByName: req.user.name || "Admin",
      });
      await order.save();
    }
  }

  const updated = await returnReq.save();
  res.json(updated);
});

// ─── Cancel Order (Customer) ──────────────────────────────────────────────────
// @route  PUT /api/orders/:id/cancel
// @access Private (customer owns the order)
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Only the order owner can cancel
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to cancel this order");
  }

  const CANCELLABLE_STATUSES = ["Pending Payment", "Confirmed"];
  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    res.status(400);
    throw new Error(
      `Orders with status "${order.status}" cannot be cancelled. Please contact us if you need help.`
    );
  }

  order.status = "Cancelled";
  order.statusHistory.push({
    status: "Cancelled",
    note: "Cancelled by customer",
    changedByName: req.user.name || "Customer",
    changedBy: req.user._id,
    updatedAt: new Date(),
  });

  const cancelled = await order.save();
  res.json({ message: "Order cancelled successfully", order: cancelled });
});

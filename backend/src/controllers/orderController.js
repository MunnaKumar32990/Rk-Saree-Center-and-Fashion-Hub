import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const addOrderItems = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error("No order items");
  }

  const order = await Order.create({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    taxPrice: taxPrice || 0,
    totalPrice,
    status: "Processing",
    statusHistory: [{ status: "Processing", note: "Order placed" }],
  });

  res.status(201).json(order);
});

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email phone");

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Only allow admin or order owner
  if (!req.user.isAdmin && order.user._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to view this order");
  }

  res.json(order);
});

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Admin
export const getOrders = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const total = await Order.countDocuments();
  const orders = await Order.find({})
    .populate("user", "id name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.json({ orders, page, pages: Math.ceil(total / limit), total });
});

// @desc    Update order to paid (via Razorpay verification)
// @route   PUT /api/orders/:id/pay
// @access  Private
export const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.status = "Confirmed";
  order.paymentResult = {
    razorpayOrderId: req.body.razorpayOrderId,
    razorpayPaymentId: req.body.razorpayPaymentId,
    razorpaySignature: req.body.razorpaySignature,
    status: "COMPLETED",
    updateTime: new Date().toISOString(),
  };
  order.statusHistory.push({ status: "Confirmed", note: "Payment received" });

  const updatedOrder = await order.save();
  res.json(updatedOrder);
});

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Admin
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.status = status;

  if (status === "Delivered") {
    order.isDelivered = true;
    order.deliveredAt = Date.now();
  }

  order.statusHistory.push({
    status,
    note: note || `Order status updated to ${status}`,
  });

  const updatedOrder = await order.save();
  res.json(updatedOrder);
});

// @desc    Mark order as delivered (Admin)
// @route   PUT /api/orders/:id/deliver
// @access  Admin
export const markOrderDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.isDelivered = true;
  order.deliveredAt = Date.now();
  order.status = "Delivered";
  order.statusHistory.push({ status: "Delivered", note: "Order delivered to customer" });

  const updatedOrder = await order.save();
  res.json(updatedOrder);
});

// @desc    Get dashboard stats
// @route   GET /api/orders/stats
// @access  Admin
export const getOrderStats = asyncHandler(async (req, res) => {
  const [orders, paidOrders, totalUsers] = await Promise.all([
    Order.find({}),
    Order.find({ isPaid: true }),
    User.countDocuments({}),
  ]);

  const totalOrders = orders.length;
  const totalRevenue = paidOrders.reduce((acc, o) => acc + o.totalPrice, 0);
  const deliveredOrders = orders.filter((o) => o.status === "Delivered").length;
  const pendingOrders = orders.filter((o) => !o.isPaid).length;

  // Per-status breakdown for dashboard chart
  const statusCounts = {};
  orders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });

  res.json({
    totalOrders,
    totalRevenue,
    deliveredOrders,
    pendingOrders,
    totalUsers,
    processingOrders: statusCounts["Processing"] || 0,
    confirmedOrders: statusCounts["Confirmed"] || 0,
    shippedOrders: statusCounts["Shipped"] || 0,
    cancelledOrders: statusCounts["Cancelled"] || 0,
  });
});

// @desc    Get monthly revenue stats
// @route   GET /api/orders/monthly-stats
// @access  Admin
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

// @desc    Create Razorpay order
// @route   POST /api/orders/razorpay
// @access  Private
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
    amount: Math.round(amount * 100), // in paise
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  };

  const order = await razorpay.orders.create(options);
  res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
});

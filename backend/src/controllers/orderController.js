import Order from "../models/Order.js";

// @desc Create new order
// @route POST /api/orders
// @access Private
export const addOrderItems = async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  if (orderItems && orderItems.length === 0) {
    return res.status(400).json({ message: "No order items" });
  }

  const order = new Order({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    totalPrice,
  });

  const createdOrder = await order.save();
  res.status(201).json(createdOrder);
};

// @desc Get logged in user orders
// @route GET /api/orders/myorders
// @access Private
export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id });
  res.json(orders);
};

// @desc Get order by ID
// @route GET /api/orders/:id
// @access Private
export const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );

  if (order) {
    res.json(order);
  } else {
    res.status(404).json({ message: "Order not found" });
  }
};

// @desc Get all orders (Admin)
// @route GET /api/orders
// @access Admin
export const getOrders = async (req, res) => {
  const orders = await Order.find({}).populate("user", "id name");
  res.json(orders);
};

// @desc Update order to delivered
// @route PUT /api/orders/:id/deliver
// @access Admin
export const markOrderDelivered = async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.isDelivered = true;
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404).json({ message: "Order not found" });
  }
};

// @desc Get dashboard stats
// @route GET /api/orders/stats
// @access Admin
export const getOrderStats = async (req, res) => {
  const orders = await Order.find({});

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce(
    (acc, order) => acc + order.totalPrice,
    0
  );

  const deliveredOrders = orders.filter(o => o.isDelivered).length;

  res.json({
    totalOrders,
    totalRevenue,
    deliveredOrders,
  });
};

// @desc Get monthly sales stats
// @route GET /api/orders/monthly-stats
// @access Admin
export const getMonthlySalesStats = async (req, res) => {
  const orders = await Order.find({ isPaid: true });

  const stats = {};

  orders.forEach(order => {
    const month = new Date(order.createdAt)
      .toLocaleString("default", { month: "short", year: "numeric" });

    stats[month] = (stats[month] || 0) + order.totalPrice;
  });

  const result = Object.keys(stats).map(key => ({
    month: key,
    revenue: stats[key],
  }));

  res.json(result);
};

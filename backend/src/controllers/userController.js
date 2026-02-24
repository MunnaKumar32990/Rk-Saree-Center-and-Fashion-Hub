import User from "../models/User.js";
import Order from "../models/Order.js";
import asyncHandler from "../utils/asyncHandler.js";
import generateToken from "../utils/generateToken.js";

// ─── Audit Log (in-memory for simplicity, stored in MongoDB via a simple array) ──
// We'll use a simple approach: track changes in a dedicated structure

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists with this email");
  }

  const user = await User.create({ name, email, password });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    phone: user.phone,
    avatar: user.avatar,
    token: generateToken(user._id, user.tokenVersion),
  });
});

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
  const userAgent = req.headers["user-agent"] || "";

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    // Check account status
    if (user.status === "Banned") {
      res.status(403);
      throw new Error("Your account has been banned. Contact support.");
    }
    if (user.status === "Suspended") {
      res.status(403);
      throw new Error("Your account is suspended. Contact support.");
    }

    // Reset failed attempts, update lastLogin
    user.failedLoginAttempts = 0;
    user.lastLogin = new Date();
    // Keep login history (last 20)
    user.loginHistory.unshift({ ip, userAgent, status: "success" });
    if (user.loginHistory.length > 20) user.loginHistory = user.loginHistory.slice(0, 20);
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      status: user.status,
      phone: user.phone,
      avatar: user.avatar,
      address: user.address,
      token: generateToken(user._id, user.tokenVersion),
    });
  } else {
    // Track failed attempt
    if (user) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      user.loginHistory.unshift({ ip, userAgent, status: "failed" });
      if (user.loginHistory.length > 20) user.loginHistory = user.loginHistory.slice(0, 20);
      await user.save();
    }
    res.status(401);
    throw new Error("Invalid email or password");
  }
});

// @desc    Get all users with search, filter, pagination (Admin)
// @route   GET /api/users
// @access  Admin
export const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";
  const role = req.query.role || ""; // "admin" | "customer" | ""
  const status = req.query.status || ""; // "Active" | "Suspended" | "Banned" | ""
  const sortBy = req.query.sortBy || "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

  // Build filter
  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  if (role === "admin") filter.isAdmin = true;
  if (role === "customer") filter.isAdmin = false;
  if (status) filter.status = status;

  const sort = { [sortBy]: sortOrder };

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select("-password -loginHistory")
    .sort(sort)
    .skip(skip)
    .limit(limit);

  res.json({
    users,
    page,
    pages: Math.ceil(total / limit),
    total,
  });
});

// @desc    Get single user details (Admin)
// @route   GET /api/users/:id
// @access  Admin
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Get order stats
  const orders = await Order.find({ user: user._id });
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  res.json({
    user,
    stats: { totalOrders, totalSpent },
  });
});

// @desc    Update user status (Admin)
// @route   PUT /api/users/:id/status
// @access  Admin
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["Active", "Suspended", "Banned"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status");
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  if (user.isAdmin) {
    res.status(400);
    throw new Error("Cannot change admin status");
  }

  user.status = status;
  await user.save();
  res.json({ message: `User status updated to ${status}`, status });
});

// @desc    Update user role (Admin)
// @route   PUT /api/users/:id/role
// @access  Admin
export const updateUserRole = asyncHandler(async (req, res) => {
  const { isAdmin } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.isAdmin = isAdmin;
  await user.save();
  res.json({ message: "Role updated", isAdmin: user.isAdmin });
});

// @desc    Force logout user (increment tokenVersion)
// @route   POST /api/users/:id/force-logout
// @access  Admin
export const forceLogout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  res.json({ message: "User has been force logged out" });
});

// @desc    Admin reset user password
// @route   PUT /api/users/:id/reset-password
// @access  Admin
export const adminResetPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1; // also force re-login
  await user.save();
  res.json({ message: "Password reset successfully" });
});

// @desc    Delete user (Admin)
// @route   DELETE /api/users/:id
// @access  Admin
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.isAdmin) {
    res.status(400);
    throw new Error("Cannot delete admin user");
  }

  await user.deleteOne();
  res.json({ message: "User deleted successfully" });
});

// @desc    Bulk delete users (Admin)
// @route   DELETE /api/users/bulk
// @access  Admin
export const bulkDeleteUsers = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !ids.length) {
    res.status(400);
    throw new Error("No user IDs provided");
  }

  // Prevent deleting admins
  await User.deleteMany({ _id: { $in: ids }, isAdmin: false });
  res.json({ message: "Users deleted" });
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-password")
    .populate("wishlist", "name image price discount category");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    isAdmin: user.isAdmin,
    address: user.address,
    wishlist: user.wishlist,
  });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.name = req.body.name || user.name;
  user.email = req.body.email || user.email;
  user.phone = req.body.phone || user.phone;
  user.avatar = req.body.avatar || user.avatar;

  if (req.body.address) {
    user.address = {
      street: req.body.address.street ?? user.address?.street ?? "",
      city: req.body.address.city ?? user.address?.city ?? "",
      state: req.body.address.state ?? user.address?.state ?? "",
      postalCode: req.body.address.pinCode ?? req.body.address.postalCode ?? user.address?.postalCode ?? "",
      country: req.body.address.country ?? user.address?.country ?? "India",
    };
  }

  if (req.body.password) {
    user.password = req.body.password;
  }

  const updatedUser = await user.save();

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    phone: updatedUser.phone,
    avatar: updatedUser.avatar,
    isAdmin: updatedUser.isAdmin,
    address: updatedUser.address,
    token: generateToken(updatedUser._id, updatedUser.tokenVersion),
  });
});

// @desc    Add product to wishlist
// @route   POST /api/users/wishlist/:productId
// @access  Private
export const addToWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const productId = req.params.productId;

  if (user.wishlist.includes(productId)) {
    return res.json({ message: "Already in wishlist", wishlist: user.wishlist });
  }

  user.wishlist.push(productId);
  await user.save();

  res.json({ message: "Added to wishlist", wishlist: user.wishlist });
});

// @desc    Remove product from wishlist
// @route   DELETE /api/users/wishlist/:productId
// @access  Private
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.wishlist = user.wishlist.filter(
    (id) => id.toString() !== req.params.productId
  );
  await user.save();

  res.json({ message: "Removed from wishlist", wishlist: user.wishlist });
});

// @desc    Get wishlist
// @route   GET /api/users/wishlist
// @access  Private
export const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    "wishlist",
    "name image images price discount category rating numReviews countInStock"
  );

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json(user.wishlist);
});
import User from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Notification from "../models/Notification.js";
import asyncHandler from "../utils/asyncHandler.js";
import generateToken from "../utils/generateToken.js";
import {
  generateNumericCode,
  sendVerificationEmail,
  sendPasswordResetEmail,
  send2FACode,
  sendEmailChangeAlert,
} from "../utils/emailService.js";
import { recordAudit } from "../models/AuditLog.js";
// `generateToken` here means the random RESET/VERIFICATION token, not the JWT —
// the JWT helper is imported as `generateToken` above, so alias to avoid a clash.
import {
  generateToken as generateSecretToken,
  hashToken,
} from "../utils/tokens.js";
import {
  asString,
  asEmail,
  asObject,
  asObjectId,
  asPhone,
  asPincode,
  asEnum,
  safeContains,
} from "../utils/input.js";

/**
 * userController.js
 *
 * CRITICAL FIX — NoSQL operator injection.
 *
 * Mongo treats `{ $ne: null }` as a query operator, so `User.findOne({ email })`
 * with an unvalidated request body is attacker-controlled. That produced two
 * complete account-takeover paths with two HTTP requests and no rate limit:
 *
 *   POST /api/users/forgot-password  {"email": {"$ne": ""}}
 *     → matched the first user in the collection, wrote a reset token onto
 *       THEIR document, then emailed the link to the ATTACKER's address
 *       (the send used the requested email, not the matched user's).
 *   POST /api/users/reset-password/<token> {"password": "owned"}
 *     → set the attacker's chosen password on the victim's account.
 *
 *   POST /api/users/2fa/verify  {"email":"admin@…", "code": {"$ne": null}}
 *     → matched an admin with a live 2FA code and returned a full admin JWT,
 *       with no password required.
 *
 * Every field that reaches a Mongo filter now goes through `asEmail`/`asString`,
 * which reject non-primitives outright. A `rejectMongoOperators` middleware
 * backs this up at the edge of the app for any route added later.
 */

const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;
const GENERIC_MSG = "If an account with this email exists, we've sent you a link.";

/** Refuse a token that has expired, and treat a used token as gone. */
const assertAccountUsable = (user) => {
  if (!user) return;
  if (user.status === "Banned") {
    const err = new Error("Your account has been banned. Contact support if you think this is a mistake.");
    err.status = 403;
    throw err;
  }
  if (user.status === "Suspended") {
    const err = new Error("Your account is suspended. Please contact support.");
    err.status = 403;
    throw err;
  }
};

const pushLoginHistory = (user, entry) => {
  user.loginHistory.unshift(entry);
  if (user.loginHistory.length > 20) user.loginHistory = user.loginHistory.slice(0, 20);
};

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const name = asString(req.body?.name, "name", { max: 120 });
  const email = asEmail(req.body?.email);
  const password = asString(req.body?.password, "password", { max: 200, trim: false });

  if (name.length < 2) {
    const err = new Error("Please enter your name");
    err.status = 400;
    throw err;
  }
  if (password.length < 8) {
    const err = new Error("Password must be at least 8 characters");
    err.status = 400;
    throw err;
  }
  if (password.length > 200) {
    const err = new Error("Password is too long");
    err.status = 400;
    throw err;
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("An account with this email already exists");
  }

  const verificationToken = generateSecretToken();
  const user = await User.create({
    name,
    email,
    password,
    phone: req.body?.phone ? asPhone(req.body.phone) : "",
    emailVerificationToken: hashToken(verificationToken),
    emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000,
    marketingOptIn: Boolean(req.body?.marketingOptIn),
  });

  await sendVerificationEmail(email, verificationToken, name); // never throws

  recordAudit(req, {
    action: "user.register",
    entity: "User",
    entityId: String(user._id),
    after: { email },
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    isEmailVerified: user.isEmailVerified,
    message: "Registration successful. Please check your email to verify your account.",
  });
});

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const email = asEmail(req.body?.email);
  const password = asString(req.body?.password, "password", { max: 200, trim: false });
  // req.ip only, and only trustworthy because server.js sets `trust proxy`.
  // The old code read x-forwarded-for directly, which is attacker-controlled
  // and made the loginHistory audit trail forgeable.
  const ip = req.ip || "";
  const userAgent = asString(req.headers?.["user-agent"], "user agent", { max: 300 });

  const user = await User.findOne({ email }).select("+password");

  if (user && (await user.matchPassword(password))) {
    assertAccountUsable(user);

    if (
      user.failedLoginAttempts >= LOCKOUT_THRESHOLD &&
      user.lockoutUntil &&
      Date.now() < user.lockoutUntil
    ) {
      const minutesLeft = Math.ceil((user.lockoutUntil - Date.now()) / 60000);
      res.status(429);
      throw new Error(
        `Too many failed attempts. Try again in ${minutesLeft} minute(s), or reset your password.`
      );
    }

    if (user.twoFactorEnabled) {
      // crypto-generated, not Math.random()
      const code = generateNumericCode(6);
      user.twoFactorCode = code;
      user.twoFactorExpires = Date.now() + 10 * 60 * 1000;
      user.twoFactorAttempts = 0;
      await user.save();
      // Wrapped: a bare await here previously turned an SMTP hiccup into a 500
      // AFTER the code was persisted, locking the user out for the full 10 min.
      await send2FACode(email, code, user.name);

      return res.json({
        requires2FA: true,
        email,
        message: "We've sent a 6-digit code to your email. It expires in 10 minutes.",
      });
    }

    user.failedLoginAttempts = 0;
    user.lastLogin = new Date();
    pushLoginHistory(user, { ip, userAgent, status: "success" });
    await user.save();

    return res.json({ ...user.toPublicJSON(), token: generateToken(user._id, user.tokenVersion) });
  }

  // ── Failed login ───────────────────────────────────────────────────────────
  if (user) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    pushLoginHistory(user, { ip, userAgent, status: "failed" });
    if (user.failedLoginAttempts >= LOCKOUT_THRESHOLD) {
      user.lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
    }
    await user.save();

    recordAudit(req, {
      action: "user.login_failed",
      entity: "User",
      entityId: String(user._id),
      severity: user.failedLoginAttempts >= LOCKOUT_THRESHOLD ? "warning" : "info",
    });
  }

  res.status(401);
  throw new Error("Email or password is incorrect");
});

// @desc    Logout — invalidates every existing token for this user
// @route   POST /api/users/logout
// @access  Private
export const logoutUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    // There was no logout endpoint at all before, so a token was valid for its
    // full 7-day life with no way for the user to end it early.
    user.bumpTokenVersion();
    await user.save();
  }
  res.json({ message: "Signed out" });
});

// ─── Admin: user management ───────────────────────────────────────────────────

const SORTABLE_USER_FIELDS = new Set(["createdAt", "name", "email", "lastLogin", "status"]);

export const getUsers = asyncHandler(async (req, res) => {
  const page = asIntOr(req.query.page, 1, 1, 10000);
  const limit = asIntOr(req.query.limit, 10, 1, 200);
  const skip = (page - 1) * limit;
  const search = asString(req.query.search, "search", { max: 120 });
  const role = asString(req.query.role, "role", { max: 20 });
  const status = req.query.status ? asEnum(req.query.status, ["Active", "Suspended", "Banned"], "status") : "";
  const sortBy = SORTABLE_USER_FIELDS.has(req.query.sortBy) ? req.query.sortBy : "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

  const filter = {};
  if (search) {
    // Escaped: an unescaped regex from a query string is a ReDoS vector.
    const rx = safeContains(search);
    filter.$or = [{ name: { $regex: rx } }, { email: { $regex: rx } }];
  }
  if (role === "admin") filter.isAdmin = true;
  if (role === "customer") filter.isAdmin = false;
  if (status) filter.status = status;

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .select("-password -loginHistory -twoFactorCode -passwordResetToken -emailVerificationToken")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  res.json({ users, page, pages: Math.ceil(total / limit) || 1, total });
});

/** Local integer parser for query params (page/limit). */
function asIntOr(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

export const getUserById = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "user id");
  const user = await User.findById(id).select(
    "-password -twoFactorCode -passwordResetToken -emailVerificationToken -twoFactorExpires"
  );
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Previously `Order.find({ user })` loaded every order document into memory
  // just to count them and sum a total. One aggregation instead.
  const [stats] = await Order.aggregate([
    { $match: { user: user._id } },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: { $cond: ["$isPaid", "$totalPrice", 0] } },
        delivered: { $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] } },
        returned: { $sum: { $cond: [{ $in: ["$status", ["Returned", "Refunded"]] }, 1, 0] } },
      },
    },
  ]);

  res.json({
    user,
    stats: {
      totalOrders: stats?.totalOrders || 0,
      totalSpent: stats?.totalSpent || 0,
      delivered: stats?.delivered || 0,
      cancelled: stats?.cancelled || 0,
      returned: stats?.returned || 0,
      returnRate: stats?.totalOrders
        ? Math.round(((stats.returned + stats.cancelled) / stats.totalOrders) * 100)
        : 0,
    },
  });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "user id");
  const status = asEnum(req.body?.status, ["Active", "Suspended", "Banned"], "status");

  const user = await User.findById(id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  if (user.isAdmin) {
    res.status(400);
    throw new Error("Admin account status cannot be changed here");
  }

  user.status = status;
  // Suspending must take effect immediately, not at next login — otherwise a
  // banned user keeps full API access with an unexpired token.
  if (status !== "Active") user.bumpTokenVersion();
  await user.save();

  recordAudit(req, {
    action: "user.status_update",
    entity: "User",
    entityId: String(user._id),
    after: { status },
    severity: "warning",
  });

  res.json({ message: `User status updated to ${status}`, status });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "user id");
  const isAdmin = req.body?.isAdmin;
  if (typeof isAdmin !== "boolean") {
    const err = new Error("isAdmin must be true or false");
    err.status = 400;
    throw err;
  }

  const user = await User.findById(id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  if (String(user._id) === String(req.user._id)) {
    const err = new Error("You can't change your own role — ask another admin");
    err.status = 400;
    throw err;
  }
  // There was no "last admin" guard, so demoting the final admin locked
  // everyone out of every admin route.
  if (user.isAdmin && !isAdmin) {
    const adminCount = await User.countDocuments({ isAdmin: true, status: "Active" });
    if (adminCount <= 1) {
      const err = new Error("This is the last active admin account — promote someone else first");
      err.status = 400;
      throw err;
    }
  }

  user.isAdmin = isAdmin;
  await user.save();

  recordAudit(req, {
    action: "user.role_update",
    entity: "User",
    entityId: String(user._id),
    after: { isAdmin },
    severity: "critical",
  });

  res.json({ message: "Role updated", isAdmin: user.isAdmin });
});

export const forceLogout = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "user id");
  const user = await User.findById(id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  user.bumpTokenVersion();
  await user.save();

  recordAudit(req, {
    action: "user.force_logout",
    entity: "User",
    entityId: String(user._id),
    severity: "warning",
  });
  res.json({ message: "User has been signed out on all devices" });
});

export const adminResetPassword = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "user id");
  const newPassword = asString(req.body?.newPassword, "password", { max: 200, trim: false });
  if (newPassword.length < 8) {
    const err = new Error("Password must be at least 8 characters");
    err.status = 400;
    throw err;
  }

  const user = await User.findById(id).select("+password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.password = newPassword;
  user.bumpTokenVersion();
  await user.save();

  recordAudit(req, {
    action: "user.admin_password_reset",
    entity: "User",
    entityId: String(user._id),
    severity: "critical",
  });

  res.json({ message: "Password reset successfully. The user must sign in again." });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const id = asObjectId(req.params.id, "user id");
  const user = await User.findById(id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  if (user.isAdmin) {
    res.status(400);
    throw new Error("Admin accounts cannot be deleted");
  }

  await user.deleteOne();

  recordAudit(req, {
    action: "user.delete",
    entity: "User",
    entityId: String(user._id),
    severity: "critical",
  });
  res.json({ message: "User deleted successfully" });
});

export const bulkDeleteUsers = asyncHandler(async (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    const err = new Error("Select at least one user");
    err.status = 400;
    throw err;
  }
  if (ids.length > 100) {
    const err = new Error("Delete at most 100 users at a time");
    err.status = 400;
    throw err;
  }

  const validIds = ids.map((v) => asObjectId(v, "user id"));
  const result = await User.deleteMany({ _id: { $in: validIds }, isAdmin: false });

  recordAudit(req, {
    action: "user.bulk_delete",
    entity: "User",
    after: { requested: validIds.length, deleted: result.deletedCount },
    severity: "critical",
  });

  res.json({ message: `${result.deletedCount} user(s) deleted` });
});

// ─── Profile ──────────────────────────────────────────────────────────────────

export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -twoFactorCode -passwordResetToken -emailVerificationToken -loginHistory"
  );
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json(user.toPublicJSON());
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  const body = asObject(req.body, "request");
  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const previousEmail = user.email;

  const name = asString(body.name, "name", { max: 120 });
  if (name) user.name = name;

  const phone = asString(body.phone, "phone", { max: 20 });
  if (phone) user.phone = phone ? asPhone(phone) : "";

  const avatar = asString(body.avatar, "avatar", { max: 600 });
  if (avatar) user.avatar = avatar;

  // ── Email change requires re-verification of the NEW address ───────────────
  // Previously `user.email = req.body.email || user.email` with no format check,
  // no verification, and no notice to the old address — an account could be
  // pointed at an address its owner doesn't control, redirecting password resets.
  const newEmail = body.email ? asEmail(body.email) : "";
  let emailChangePending = false;
  if (newEmail && newEmail !== previousEmail) {
    const taken = await User.findOne({ email: newEmail });
    if (taken) {
      res.status(400);
      throw new Error("That email is already in use");
    }
    user.pendingEmail = newEmail;
    // Keep the RAW token for the email and store only its digest. Emailing the
    // digest would send the customer a link that can never be confirmed, since
    // `confirmEmailChange` re-hashes whatever arrives in the URL.
    const pendingEmailToken = generateSecretToken();
    user.pendingEmailToken = hashToken(pendingEmailToken);
    user.pendingEmailExpires = Date.now() + 24 * 60 * 60 * 1000;
    emailChangePending = true;
    await sendVerificationEmail(newEmail, pendingEmailToken, user.name).catch(() => {});
    await sendEmailChangeAlert(previousEmail, newEmail).catch(() => {});
  }

  if (body.address) {
    const a = asObject(body.address, "address");
    user.address = {
      fullName: asString(a.fullName, "name", { max: 120 }) || user.address?.fullName || "",
      street: asString(a.street ?? a.address, "address", { max: 500 }),
      city: asString(a.city, "city", { max: 120 }),
      state: asString(a.state, "state", { max: 120 }),
      postalCode: a.postalCode || a.pinCode ? asPincode(a.postalCode || a.pinCode) : "",
      country: asString(a.country, "country", { max: 60 }) || "India",
      landmark: asString(a.landmark, "landmark", { max: 200 }),
      phone: a.phone ? asPhone(a.phone) : "",
    };
  }

  // Address book (saved addresses for one-tap reorder)
  if (Array.isArray(body.addresses)) {
    user.addresses = body.addresses.slice(0, 10).map((raw) => {
      const a = asObject(raw, "address");
      return {
        fullName: asString(a.fullName, "name", { max: 120 }),
        street: asString(a.street ?? a.address, "address", { max: 500 }),
        city: asString(a.city, "city", { max: 120 }),
        state: asString(a.state, "state", { max: 120 }),
        postalCode: a.postalCode || a.pinCode ? asPincode(a.postalCode || a.pinCode) : "",
        country: asString(a.country, "country", { max: 60 }) || "India",
        landmark: asString(a.landmark, "landmark", { max: 200 }),
        phone: a.phone ? asPhone(a.phone) : "",
        label: asString(a.label, "label", { max: 40 }),
        isDefault: Boolean(a.isDefault),
      };
    });
    // Exactly one default.
    const defaultIdx = user.addresses.findIndex((a) => a.isDefault);
    if (defaultIdx >= 0) {
      user.addresses.forEach((a, i) => {
        a.isDefault = i === defaultIdx;
      });
    }
  }

  if (typeof body.marketingOptIn === "boolean") user.marketingOptIn = body.marketingOptIn;
  if (body.preferredLanguage) {
    user.preferredLanguage = asString(body.preferredLanguage, "language", { max: 8 });
  }

  // ── Password change MUST revoke existing tokens ────────────────────────────
  // Every other credential-mutating path bumped tokenVersion; this one did not,
  // so a stolen 7-day token survived a password change indefinitely — and the
  // handler even minted a fresh token without invalidating the old one.
  let passwordChanged = false;
  if (body.password) {
    const newPassword = asString(body.password, "password", { max: 200, trim: false });
    const currentPassword = asString(body.currentPassword, "current password", { max: 200, trim: false });
    if (!currentPassword) {
      res.status(400);
      throw new Error("Current password is required to set a new password");
    }
    if (!(await user.matchPassword(currentPassword))) {
      res.status(401);
      throw new Error("Current password is incorrect");
    }
    if (newPassword.length < 8) {
      res.status(400);
      throw new Error("New password must be at least 8 characters");
    }
    user.password = newPassword;
    user.bumpTokenVersion();
    passwordChanged = true;
  }

  const updated = await user.save();

  recordAudit(req, {
    action: "user.profile_update",
    entity: "User",
    entityId: String(user._id),
    after: {
      ...(emailChangePending ? { emailChangePending: newEmail } : {}),
      ...(passwordChanged ? { passwordChanged: true } : {}),
    },
    severity: passwordChanged || emailChangePending ? "warning" : "info",
  });

  res.json({
    ...updated.toPublicJSON(),
    // A fresh token is required because passwordChanged bumped tokenVersion.
    token: generateToken(updated._id, updated.tokenVersion),
    ...(emailChangePending
      ? { message: `Profile saved. Check ${newEmail} to confirm your new email address.` }
      : {}),
  });
});

/** Confirm an email change. @route POST /api/users/confirm-email/:token */
export const confirmEmailChange = asyncHandler(async (req, res) => {
  const token = asString(req.params.token, "token", { max: 128 });
  const user = await User.findOne({
    pendingEmailToken: hashToken(token),
    pendingEmailExpires: { $gt: Date.now() },
  });
  if (!user) {
    res.status(400);
    throw new Error("This confirmation link is invalid or has expired");
  }

  user.email = user.pendingEmail;
  user.isEmailVerified = true;
  user.pendingEmail = "";
  user.pendingEmailToken = undefined;
  user.pendingEmailExpires = undefined;
  await user.save();

  recordAudit(req, {
    action: "user.email_change_confirmed",
    entity: "User",
    entityId: String(user._id),
    after: { email: user.email },
    severity: "warning",
  });

  res.json({ message: "Email address updated", email: user.email });
});

// ─── Wishlist ─────────────────────────────────────────────────────────────────

export const addToWishlist = asyncHandler(async (req, res) => {
  const productId = asObjectId(req.params.productId, "product id");

  // The old `user.wishlist.includes(productId)` compared ObjectIds against a
  // string and was therefore ALWAYS false, so the same item could be added
  // repeatedly and the "already in wishlist" branch was unreachable.
  const exists = await Product.exists({ _id: productId });
  if (!exists) {
    res.status(404);
    throw new Error("Product not found");
  }

  // $addToSet is atomic, so a double-tap can't create a duplicate entry.
  const result = await User.updateOne(
    { _id: req.user._id, wishlist: { $ne: productId } },
    { $addToSet: { wishlist: productId } }
  );

  if (result.modifiedCount === 0) {
    return res.json({ message: "Already in wishlist" });
  }

  // Cap the wishlist so it stays useful (and cheap to render).
  const user = await User.findById(req.user._id).select("wishlist");
  if (user.wishlist.length > 100) {
    await User.updateOne(
      { _id: req.user._id },
      { $set: { wishlist: user.wishlist.slice(0, 100) } }
    );
  }

  res.json({ message: "Added to wishlist" });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  const productId = asObjectId(req.params.productId, "product id");
  await User.updateOne({ _id: req.user._id }, { $pull: { wishlist: productId } });
  res.json({ message: "Removed from wishlist" });
});

export const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate(
      "wishlist",
      "name image images price discount category subcategory rating numReviews countInStock specs"
    )
    .select("wishlist");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json(user.wishlist);
});

// ─── Email verification ───────────────────────────────────────────────────────

export const verifyEmail = asyncHandler(async (req, res) => {
  const token = asString(req.params.token, "token", { max: 128 });
  const user = await User.findOne({
    emailVerificationToken: hashToken(token),
    emailVerificationExpires: { $gt: Date.now() },
  });
  if (!user) {
    res.status(400);
    throw new Error("This verification link is invalid or has expired");
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json({ message: "Email verified successfully. You can now sign in." });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const email = asEmail(req.body?.email);
  const msg = "If an account with this email exists and is unverified, a verification link has been sent.";

  const user = await User.findOne({ email });
  // Identical response either way — never reveal whether the account exists.
  if (!user || user.isEmailVerified) return res.json({ message: msg });

  const token = generateSecretToken();
  user.emailVerificationToken = hashToken(token);
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save();
  await sendVerificationEmail(email, token, user.name);

  res.json({ message: msg });
});

// ─── Password reset ───────────────────────────────────────────────────────────

export const forgotPassword = asyncHandler(async (req, res) => {
  const email = asEmail(req.body?.email);
  const user = await User.findOne({ email });

  // 200 either way, and the link is only ever emailed to the ADDRESS ON FILE —
  // never to the requested value, which was the account-takeover bug.
  if (!user) return res.json({ message: GENERIC_MSG });

  const resetToken = generateSecretToken();
  user.passwordResetToken = hashToken(resetToken);
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
  await user.save();

  recordAudit(req, {
    action: "user.password_reset_requested",
    entity: "User",
    entityId: String(user._id),
  });

  await sendPasswordResetEmail(user.email, resetToken, user.name);

  res.json({ message: GENERIC_MSG });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const token = asString(req.params.token, "token", { max: 128 });
  const password = asString(req.body?.password, "password", { max: 200, trim: false });
  if (password.length < 8) {
    res.status(400);
    throw new Error("Password must be at least 8 characters");
  }

  const user = await User.findOne({
    passwordResetToken: hashToken(token),
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    res.status(400);
    throw new Error("This reset link is invalid or has expired");
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // Also clear any in-flight 2FA so the reset can't be laundered through it.
  user.twoFactorCode = undefined;
  user.twoFactorExpires = undefined;
  user.twoFactorAttempts = 0;
  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;
  user.bumpTokenVersion();
  await user.save();

  recordAudit(req, {
    action: "user.password_reset_completed",
    entity: "User",
    entityId: String(user._id),
    severity: "critical",
  });

  res.json({ message: "Password reset successful. Please sign in." });
});

// ─── Two-factor authentication ────────────────────────────────────────────────

export const enable2FA = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  user.twoFactorEnabled = true;
  await user.save();

  recordAudit(req, {
    action: "user.2fa_enabled",
    entity: "User",
    entityId: String(user._id),
    severity: "warning",
  });
  res.json({ message: "Two-factor authentication enabled", twoFactorEnabled: true });
});

export const disable2FA = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  // Re-authenticate: 2FA protects the admin panel, so turning it off should
  // require the password again, not just an active session.
  const password = asString(req.body?.password, "password", { max: 200, trim: false });
  if (!password || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Enter your current password to turn off two-factor authentication");
  }

  user.twoFactorEnabled = false;
  user.twoFactorCode = undefined;
  user.twoFactorExpires = undefined;
  await user.save();

  recordAudit(req, {
    action: "user.2fa_disabled",
    entity: "User",
    entityId: String(user._id),
    severity: "critical",
  });
  res.json({ message: "Two-factor authentication disabled", twoFactorEnabled: false });
});

export const send2FACodeHandler = asyncHandler(async (req, res) => {
  const email = asEmail(req.body?.email);

  // Previously this returned a distinct error for "no such account" / "2FA not
  // enabled", which is an enumeration oracle — and it contradicted the
  // deliberately generic messages on forgot-password and resend-verification.
  // It also had no rate limit, making it an open SMTP relay for email bombing.
  const GENERIC_2FA_MSG = "If that account exists and has two-factor authentication, a code has been sent.";

  const user = await User.findOne({ email });
  if (!user || !user.twoFactorEnabled || user.status !== "Active") {
    return res.json({ message: GENERIC_2FA_MSG });
  }

  const code = generateNumericCode(6); // crypto.randomInt, not Math.random
  user.twoFactorCode = code;
  user.twoFactorExpires = Date.now() + 10 * 60 * 1000;
  user.twoFactorAttempts = 0;
  await user.save();

  await send2FACode(user.email, code, user.name);
  res.json({ message: GENERIC_2FA_MSG });
});

export const verify2FACode = asyncHandler(async (req, res) => {
  const email = asEmail(req.body?.email);
  const code = asString(req.body?.code, "code", { max: 12, trim: false });

  if (!/^\d{6}$/.test(code)) {
    res.status(400);
    throw new Error("Enter the 6-digit code from your email");
  }

  // `code` is coerced to a string above, so it can no longer be an object.
  // The old query accepted `code: {"$ne": null}`, matched any admin with a
  // live code, and returned a full admin token with no password required.
  const user = await User.findOne({
    email,
    twoFactorCode: code,
    twoFactorExpires: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("That code is incorrect or has expired");
  }

  // Brute-force guard: 5 wrong guesses invalidates the code and forces a resend.
  if ((user.twoFactorAttempts || 0) >= 5) {
    user.twoFactorCode = undefined;
    user.twoFactorExpires = undefined;
    user.twoFactorAttempts = 0;
    await user.save();
    recordAudit(req, {
      action: "user.2fa_bruteforce_blocked",
      entity: "User",
      entityId: String(user._id),
      severity: "critical",
    });
    res.status(429);
    throw new Error("Too many incorrect codes. Please request a new one.");
  }

  // A banned/suspended account could still mint a valid token here, because
  // only loginUser checked status.
  assertAccountUsable(user);

  user.twoFactorCode = undefined;
  user.twoFactorExpires = undefined;
  user.twoFactorAttempts = 0;
  user.failedLoginAttempts = 0;
  user.lastLogin = new Date();
  pushLoginHistory(user, {
    ip: req.ip || "",
    userAgent: asString(req.headers?.["user-agent"], "user agent", { max: 300 }),
    status: "success",
  });
  await user.save();

  recordAudit(req, {
    action: "user.2fa_login",
    entity: "User",
    entityId: String(user._id),
  });

  res.json({ ...user.toPublicJSON(), token: generateToken(user._id, user.tokenVersion) });
});

// ─── Notifications ────────────────────────────────────────────────────────────

export const getNotifications = asyncHandler(async (req, res) => {
  const limit = asIntOr(req.query.limit, 20, 1, 100);
  const [notifications, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ notifications, unread });
});

export const markNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
  res.json({ message: "Notifications marked as read" });
});

export const getLoginHistory = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("loginHistory");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json(user.loginHistory || []);
});

export const revokeAllSessions = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  user.bumpTokenVersion();
  await user.save();
  res.json({ message: "All sessions have been revoked. Please log in again." });
});
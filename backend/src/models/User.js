import mongoose from "mongoose";
// NATIVE bcrypt, not bcryptjs.
//
// The two have an identical API and identical cost factors, but `bcryptjs` is
// pure JavaScript, so its ~265 ms per hash/compare runs ON the event loop and
// blocks every other request in the process for that duration. Native bcrypt
// does the same work on the libuv threadpool, so a burst of 20 login attempts —
// which is exactly what a credential-stuffing attempt looks like — no longer
// stalls browsing customers.
//
// Measured on this codebase's cost factor of 12:
//   bcryptjs  hash 265ms / compare 266ms   (event loop blocked for that long)
//   bcrypt    hash 228ms / compare 228ms   (threadpool, concurrent)
//
// Same wall-clock cost per login, same security, but one no longer takes the
// shop offline with it.
import bcrypt from "bcrypt";

const loginHistorySchema = mongoose.Schema({
  ip: { type: String, default: "" },
  userAgent: { type: String, default: "", maxlength: 300 },
  status: { type: String, enum: ["success", "failed"], default: "success" },
  timestamp: { type: Date, default: Date.now },
});

const addressSchema = mongoose.Schema({
  fullName: { type: String, default: "", maxlength: 120 },
  street: { type: String, default: "", maxlength: 500 },
  city: { type: String, default: "", maxlength: 120 },
  state: { type: String, default: "", maxlength: 120 },
  postalCode: { type: String, default: "", maxlength: 6 },
  country: { type: String, default: "India", maxlength: 60 },
  landmark: { type: String, default: "", maxlength: 200 },
  phone: { type: String, default: "", maxlength: 20 },
  label: { type: String, default: "", maxlength: 40 }, // "Home" | "Office"
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 20,
    },
    avatar: {
      type: String,
      default: "",
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    // Account status
    status: {
      type: String,
      enum: ["Active", "Suspended", "Banned"],
      default: "Active",
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    // Pending change to a new email address. The address is only swapped once
    // verified — otherwise an account can be pointed at an address its owner
    // does not control, and password-reset mails go to the wrong person.
    pendingEmail: { type: String, default: "", lowercase: true, trim: true },
    pendingEmailToken: String,
    pendingEmailExpires: Date,
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorCode: String,
    twoFactorExpires: Date,
    twoFactorAttempts: { type: Number, default: 0 },
    // Address book. Customers reordered once without ever saving an address,
    // so every repeat order was a full retype on mobile.
    addresses: { type: [addressSchema], default: [] },
    // Kept for backwards compatibility with the existing profile UI
    address: {
      fullName: { type: String, default: "", maxlength: 120 },
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      country: { type: String, default: "India" },
      phone: { type: String, default: "" },
      landmark: { type: String, default: "" },
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    // Security tracking
    lastLogin: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date, default: null },
    loginHistory: {
      type: [loginHistorySchema],
      default: [],
    },
    // Force logout token version
    tokenVersion: { type: Number, default: 0 },
    marketingOptIn: { type: Boolean, default: false },
    preferredLanguage: { type: String, default: "en", maxlength: 8 },
  },
  { timestamps: true }
);

userSchema.index({ phone: 1 });
userSchema.index({ status: 1, createdAt: -1 });
userSchema.index({ wishlist: 1 });

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  // Raised from 10 to 12. This is materially more expensive to brute-force.
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (typeof enteredPassword !== "string" || !enteredPassword) return false;
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

/** Bump to invalidate every previously issued JWT for this user. */
userSchema.methods.bumpTokenVersion = function () {
  this.tokenVersion = (this.tokenVersion || 0) + 1;
  return this.tokenVersion;
};

/** Shared shape returned to the client — never includes the password hash. */
userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    avatar: this.avatar,
    isAdmin: this.isAdmin,
    role: this.isAdmin ? "admin" : "user",
    status: this.status,
    isEmailVerified: this.isEmailVerified,
    twoFactorEnabled: this.twoFactorEnabled,
    address: this.address,
    addresses: this.addresses,
    wishlist: this.wishlist,
    lastLogin: this.lastLogin,
    marketingOptIn: this.marketingOptIn,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model("User", userSchema);
export default User;
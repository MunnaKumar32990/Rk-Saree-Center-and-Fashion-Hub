import mongoose from "mongoose";

/**
 * Input hardening helpers.
 *
 * MongoDB treats `{ $ne: null }` as a valid *operator*, so any endpoint that
 * passes an unvalidated request-body field straight into a query can be turned
 * into a query operator. That is the root cause of the account-takeover bugs via
 * the password-reset and 2FA endpoints.
 *
 * The rule enforced here: every value that crosses from `req.body` / `req.query`
 * into a Mongo filter MUST be a primitive coerced by one of these functions.
 * Anything that is not a string/number/boolean is rejected outright.
 */

const isPlainString = (v) => typeof v === "string";

/** Throw if `v` is not a primitive string. */
export function asString(value, field = "value", { max = 500, trim = true } = {}) {
  if (value === undefined || value === null) return "";
  if (!isPlainString(value)) {
    const err = new Error(`Invalid ${field}`);
    err.status = 400;
    throw err;
  }
  const out = trim ? value.trim() : value;
  if (out.length > max) {
    const err = new Error(`${field} is too long (max ${max} characters)`);
    err.status = 400;
    throw err;
  }
  return out;
}

/** Throw unless `v` is a string that looks like an email address. */
export function asEmail(value, field = "email") {
  const out = asString(value, field, { max: 254 }).toLowerCase();
  // Deliberately conservative: reject anything with characters Mongo operators need.
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(out)) {
    const err = new Error("Please enter a valid email address");
    err.status = 400;
    throw err;
  }
  return out;
}

/** Throw unless `v` is a base-10 integer inside [min, max]. */
export function asInt(value, field = "value", { min = -Infinity, max = Infinity } = {}) {
  if (typeof value === "boolean") {
    const err = new Error(`Invalid ${field}`);
    err.status = 400;
    throw err;
  }
  if (typeof value === "string" && !/^-?\d+$/.test(value.trim())) {
    const err = new Error(`${field} must be a whole number`);
    err.status = 400;
    throw err;
  }
  if (typeof value !== "number" && typeof value !== "string") {
    const err = new Error(`Invalid ${field}`);
    err.status = 400;
    throw err;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    const err = new Error(`${field} must be a whole number`);
    err.status = 400;
    throw err;
  }
  if (n < min || n > max) {
    const err = new Error(`${field} must be between ${min} and ${max}`);
    err.status = 400;
    throw err;
  }
  return n;
}

/** Throw unless `v` is a finite number (int or float). */
export function asNumber(value, field = "value", { min = -Infinity, max = Infinity } = {}) {
  if (typeof value === "boolean" || (typeof value !== "number" && typeof value !== "string")) {
    const err = new Error(`Invalid ${field}`);
    err.status = 400;
    throw err;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    const err = new Error(`${field} must be a number`);
    err.status = 400;
    throw err;
  }
  if (n < min || n > max) {
    const err = new Error(`${field} must be between ${min} and ${max}`);
    err.status = 400;
    throw err;
  }
  return n;
}

/** Throw unless `v` is a boolean. Accepts "true"/"false" strings from query strings. */
export function asBool(value, field = "value", fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  const err = new Error(`Invalid ${field}`);
  err.status = 400;
  throw err;
}

/** Throw unless `v` is a string contained in `allowed`. */
export function asEnum(value, allowed, field = "value", fallback) {
  if (value === undefined || value === null || value === "") {
    if (fallback !== undefined) return fallback;
    const err = new Error(`${field} is required`);
    err.status = 400;
    throw err;
  }
  const out = asString(value, field, { max: 64 });
  if (!allowed.includes(out)) {
    const err = new Error(`Invalid ${field}`);
    err.status = 400;
    throw err;
  }
  return out;
}

/** Throw unless `v` is a valid Mongo ObjectId. Returns the ObjectId. */
export function asObjectId(value, field = "id") {
  const str = typeof value === "string" ? value.trim() : "";
  if (!/^[0-9a-fA-F]{24}$/.test(str)) {
    const err = new Error(`Invalid ${field}`);
    err.status = 400;
    throw err;
  }
  return new mongoose.Types.ObjectId(str);
}

/**
 * Escape regex metacharacters.
 *
 * Without this, a search term like `(a+)+$` is a catastrophic-backtracking regex
 * executed by MongoDB — a one-field ReDoS that stalls the query.
 */
export function escapeRegex(value, max = 120) {
  return asString(value, "search", { max }).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a safe, case-insensitive, non-regex substring matcher. */
export function safeContains(value, max = 120) {
  return new RegExp(escapeRegex(value, max), "i");
}

/**
 * Middleware: reject any request whose body/query/params contains a Mongo
 * operator key (`$`-prefixed) or a `$`-containing dotted key.
 *
 * This is defence in depth behind the coercion helpers — it protects any
 * endpoint added in the future, including ones nobody thinks about.
 */
export function rejectMongoOperators(req, _res, next) {
  const scan = (obj, depth = 0) => {
    if (depth > 6 || obj === null || typeof obj !== "object") return null;
    if (Array.isArray(obj)) {
      for (const entry of obj) {
        const bad = scan(entry, depth + 1);
        if (bad) return bad;
      }
      return null;
    }
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith("$") || key.includes("$.")) return key;
      const bad = scan(value, depth + 1);
      if (bad) return bad;
    }
    return null;
  };

  const bad =
    scan(req.body) ||
    scan(req.query) ||
    scan(req.params) ||
    null;

  if (bad) {
    const err = new Error("Malformed request: unsupported field name");
    err.status = 400;
    return next(err);
  }
  next();
}

/** Throw unless `v` is a plain object (not null, not an array). */
export function asObject(value, field = "body") {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    const err = new Error(`Invalid ${field}`);
    err.status = 400;
    throw err;
  }
  for (const key of Object.keys(value)) {
    if (key.startsWith("$")) {
      const err = new Error("Malformed request: unsupported field name");
      err.status = 400;
      throw err;
    }
  }
  return value;
}

/** Sanitize a free-text field for safe storage and safe HTML/email rendering. */
export function asText(value, field = "text", max = 5000) {
  return asString(value, field, { max, trim: true });
}

/** Validate and normalize an Indian PIN code. Returns "" when empty. */
export function asPincode(value, field = "postalCode") {
  const out = asString(value, field, { max: 6 }).replace(/\D/g, "");
  if (out.length !== 6) {
    const err = new Error("Enter a valid 6-digit PIN code");
    err.status = 400;
    throw err;
  }
  return out;
}

/** Validate and normalize an Indian mobile number to 10 digits. */
export function asPhone(value, field = "phone") {
  const out = asString(value, field, { max: 20 }).replace(/[^\d]/g, "");
  const ten = out.length === 12 && out.startsWith("91") ? out.slice(2) : out;
  if (!/^[6-9]\d{9}$/.test(ten)) {
    const err = new Error("Enter a valid 10-digit Indian mobile number");
    err.status = 400;
    throw err;
  }
  return ten;
}

/** Hex colour (used for inline styles — prevents CSS injection). */
export function asHexColor(value, field = "color", fallback = "#0F766E") {
  const out = asString(value, field, { max: 20 });
  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(out)) return fallback;
  return out;
}
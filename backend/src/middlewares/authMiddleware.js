import User from "../models/User.js";
import { verifyToken } from "../utils/generateToken.js";

/**
 * authMiddleware.js
 *
 * Improvements over the original:
 *  - Distinguishes an expired token from an invalid one. The old code returned
 *    the same generic message for every failure, so the client couldn't tell
 *    "refresh/session ended" from "malformed token".
 *  - `protect` now also rejects a Suspended/Banned account on an existing token.
 *    Previously only `loginUser` checked status, so a suspended user kept full
 *    API access until their token naturally expired.
 *  - Never leaks the reason for failure in production.
 */

export const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Please sign in to continue" });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ message: "Please sign in to continue" });
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Your session expired. Please sign in again.",
        code: "TOKEN_EXPIRED",
      });
    }
    return res.status(401).json({ message: "Invalid session. Please sign in again." });
  }

  try {
    const user = await User.findById(decoded.id).select(
      "-password -twoFactorCode -passwordResetToken -emailVerificationToken"
    );

    if (!user) {
      return res.status(401).json({ message: "Account not found. Please sign in again." });
    }

    // tokenVersion is what makes logout / force-logout / password change
    // actually revoke existing tokens.
    if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      return res.status(401).json({
        message: "Your session ended. Please sign in again.",
        code: "TOKEN_REVOKED",
      });
    }

    if (user.status !== "Active") {
      return res.status(403).json({
        message:
          user.status === "Banned"
            ? "Your account has been banned. Contact support."
            : "Your account is suspended. Please contact support.",
        code: "ACCOUNT_RESTRICTED",
      });
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
};

export const admin = (req, res, next) => {
  if (req.user?.isAdmin) return next();
  return res.status(403).json({ message: "This action requires administrator access" });
};

/** Optional auth: populates req.user when a valid token is present. */
export const optionalAuth = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();
  try {
    const decoded = verifyToken(header.slice(7).trim());
    const user = await User.findById(decoded.id)
      .select("-password")
      .lean();
    if (user && (decoded.tokenVersion ?? 0) === (user.tokenVersion ?? 0) && user.status === "Active") {
      req.user = user;
    }
  } catch {
    // An invalid token on a public route is simply ignored.
  }
  return next();
};
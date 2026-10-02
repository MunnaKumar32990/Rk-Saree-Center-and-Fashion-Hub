import express from "express";
import { sharedLimiter } from "../utils/rateLimitStore.js";
import { sendContactEmail, checkPincode } from "../controllers/contactController.js";

const router = express.Router();

/**
 * The contact form is public and unauthenticated, and it sends mail. Without a
 * limit it was an open relay: anyone could use the business's SMTP credentials
 * to mail-bomb an arbitrary address, or just drive the inbox with spam.
 */
const contactLimiter = sharedLimiter("contact", {
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "You've sent several messages already. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

/** PIN lookups hit a third-party API, so they're throttled harder. */
const pincodeLimiter = sharedLimiter("pincode", {
  windowMs: 60 * 1000,
  max: 20,
  message: { message: "Too many lookups. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/send", contactLimiter, sendContactEmail);
router.post("/check-pincode", pincodeLimiter, checkPincode);

export default router;
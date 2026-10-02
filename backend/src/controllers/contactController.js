import asyncHandler from "../utils/asyncHandler.js";
import { sendContactFormEmail, emailConfigured } from "../utils/emailService.js";
import { asString, asEmail, asObject } from "../utils/input.js";
import { lookupPincode } from "../utils/pincode.js";

/**
 * Contact form.
 *
 * The previous version had its own nodemailer transport built from
 * EMAIL_HOST / EMAIL_PORT / ADMIN_RECEIVER_EMAIL — variables that were never
 * documented in .env.example, so the form 500'd on a fresh install. It also
 * called `transporter.verify()` on every request (a slow DoS amplifier) and
 * interpolated `name`, `subject` and `message` straight into HTML — so anyone
 * who submitted the public form could inject markup into the business owner's
 * mail client. Everything now goes through the shared, HTML-escaped email
 * service.
 */
export const sendContactEmail = asyncHandler(async (req, res) => {
  const b = asObject(req.body, "request");
  const name = asString(b.name, "name", { max: 120 });
  const email = asEmail(b.email);
  const subject = asString(b.subject, "subject", { max: 200 });
  const message = asString(b.message, "message", { max: 5000 });

  if (!name || !email || !subject || !message) {
    res.status(400);
    throw new Error("Please fill in every field");
  }
  if (message.length < 10) {
    res.status(400);
    throw new Error("Please add a little more detail so we can help");
  }

  if (!emailConfigured()) {
    // Don't pretend to have accepted a message we can't deliver. Offer the
    // alternative channel the customer can actually use.
    res.status(503);
    throw new Error(
      "Messaging is temporarily unavailable. Please WhatsApp or call us and we'll help right away."
    );
  }

  const sent = await sendContactFormEmail({ name, email, subject, message });

  if (!sent) {
    res.status(503);
    throw new Error("We couldn't send that just now. Please try again, or WhatsApp us.");
  }

  res.json({
    success: true,
    message: "Thanks for getting in touch — we've emailed you a copy and will reply within one working day.",
  });
});

/**
 * PIN-code serviceability check, used by the checkout form to validate the
 * address before the customer commits to an order.
 *
 * @route POST /api/contact/check-pincode
 * @access Public
 */
export const checkPincode = asyncHandler(async (req, res) => {
  const pin = asString(req.body?.pincode, "PIN code", { max: 6 });
  const result = await lookupPincode(pin);
  res.json(result);
});
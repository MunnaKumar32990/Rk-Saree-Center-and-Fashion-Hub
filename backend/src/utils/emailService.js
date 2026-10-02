import nodemailer from "nodemailer";
import crypto from "crypto";

/**
 * emailService.js — transactional email.
 *
 * Fixes over the original:
 *  - HTML escaping. `${name}` was interpolated raw into HTML, so a user who
 *    signed up with a crafted name could inject markup into the admin's mail
 *    client (stored XSS by email).
 *  - A single verified transport instead of the contact controller's divergent
 *    host/port config, which read env vars that were never documented and made
 *    the contact form 500 out of the box.
 *  - Verified-once, cached transport. `transporter.verify()` per request was a
 *    slow trivial DoS amplifier.
 *  - Every send is wrapped. Previously `send2FACode` was awaited bare, so an
 *    SMTP hiccup returned a 500 *after* the code was persisted, locking the
 *    user out for the full 10-minute expiry.
 */

const BRAND = process.env.EMAIL_FROM_NAME || "RK Saree & Fashion Hub";
const BRAND_COLOR = "#0F766E";
const SUPPORT_EMAIL = process.env.BUSINESS_EMAIL || process.env.ADMIN_RECEIVER_EMAIL || process.env.EMAIL_USER;
const SUPPORT_PHONE = process.env.BUSINESS_PHONE || "";
const WHATSAPP = process.env.BUSINESS_WHATSAPP || "";

const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

let transporter;
let verified = false;

export function emailConfigured() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

function getTransporter() {
  if (!emailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return transporter;
}

/** Verify credentials once at startup rather than on every request. */
export async function verifyEmailTransport() {
  if (!emailConfigured()) {
    console.warn("[email] EMAIL_USER/EMAIL_PASS not set — transactional email disabled");
    return false;
  }
  try {
    await getTransporter().verify();
    verified = true;
    console.log("[email] transport verified");
    return true;
  } catch (err) {
    console.error("[email] transport verification failed:", err?.message || err);
    return false;
  }
}

/** Escape untrusted text for safe interpolation into HTML. */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only allow http(s) URLs into href/src attributes. */
function safeUrl(value) {
  const raw = String(value ?? "").trim();
  return /^https?:\/\//i.test(raw) ? raw : "#";
}

export function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function generateNumericCode(digits = 6) {
  // crypto.randomInt, not Math.random — the latter is not a CSPRNG and was
  // being used to generate a 2FA token.
  const min = 10 ** (digits - 1);
  return String(min + crypto.randomInt(0, 9 * min)).padStart(digits, "0");
}

/**
 * Send an email. Resolves to true/false, never throws — callers must never fail
 * a business operation because SMTP was briefly unavailable.
 */
async function send({ to, subject, html, text }) {
  const tx = getTransporter();
  if (!tx) {
    console.warn(`[email] skipped "${subject}" — not configured`);
    return false;
  }
  try {
    await tx.sendMail({
      from: `"${BRAND}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (err) {
    console.error(`[email] failed "${subject}" to ${to}:`, err?.message || err);
    return false;
  }
}

const shell = ({ title, body, cta }) => `
<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr><td style="background:${BRAND_COLOR};padding:22px 28px;">
          <span style="color:#fff;font-size:19px;font-weight:700;letter-spacing:.3px;">${escapeHtml(BRAND)}</span>
        </td></tr>
        <tr><td style="padding:28px;color:#1f2937;font-size:15px;line-height:1.65;">
          <h1 style="margin:0 0 14px;font-size:20px;color:${BRAND_COLOR};">${escapeHtml(title)}</h1>
          ${body}
          ${cta || ""}
        </td></tr>
        <tr><td style="padding:18px 28px;background:#fafafa;border-top:1px solid #eee;color:#6b7280;font-size:13px;line-height:1.6;">
          <p style="margin:0 0 6px;">Questions? Reply to this email${SUPPORT_PHONE ? ` or call ${escapeHtml(SUPPORT_PHONE)}` : ""}.</p>
          ${WHATSAPP ? `<p style="margin:0;">Chat with us on WhatsApp: <a href="https://wa.me/${escapeHtml(WHATSAPP)}" style="color:${BRAND_COLOR};">${escapeHtml(WHATSAPP)}</a></p>` : ""}
        </td></tr>
      </table>
      <p style="max-width:600px;margin:14px auto 0;color:#9ca3af;font-size:12px;text-align:center;">
        You are receiving this because you have an account with ${escapeHtml(BRAND)}.
      </p>
    </td></tr>
  </table>
</body></html>`;

const button = (label, url) =>
  `<p style="margin:22px 0;"><a href="${safeUrl(url)}" style="display:inline-block;padding:13px 26px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">${escapeHtml(label)}</a></p>`;

// ── Auth emails ───────────────────────────────────────────────────────────────

export async function sendVerificationEmail(email, token, name) {
  const url = `${FRONTEND_URL}/verify-email/${token}`;
  return send({
    to: email,
    subject: "Verify your email address",
    html: shell({
      title: `Welcome, ${escapeHtml(name || "there")}!`,
      body: `<p>Thanks for shopping with us. Please confirm your email address to secure your account and get order updates.</p>
             <p style="color:#6b7280;font-size:13px;">This link expires in 24 hours.</p>`,
      cta: button("Verify my email", url),
    }),
    text: `Hi ${name || "there"}, verify your email: ${url} (expires in 24 hours)`,
  });
}

export async function sendPasswordResetEmail(email, token, name) {
  const url = `${FRONTEND_URL}/reset-password/${token}`;
  return send({
    to: email,
    subject: "Reset your password",
    html: shell({
      title: "Password reset",
      body: `<p>Hi ${escapeHtml(name || "there")},</p>
             <p>We received a request to reset your password. This link expires in <strong>1 hour</strong>.</p>
             <p>If you didn't request this, you can safely ignore this email — your password stays unchanged.</p>`,
      cta: button("Choose a new password", url),
    }),
    text: `Hi ${name || "there"}, reset your password: ${url} (expires in 1 hour)`,
  });
}

export async function send2FACode(email, code, name) {
  return send({
    to: email,
    subject: `${code} is your verification code`,
    html: shell({
      title: "Your verification code",
      body: `<p>Hi ${escapeHtml(name || "there")}, enter this code to finish signing in:</p>
             <p style="margin:20px 0;padding:16px 20px;background:#f3f4f6;border-radius:10px;text-align:center;">
               <span style="font-size:30px;font-weight:700;letter-spacing:9px;color:${BRAND_COLOR};">${escapeHtml(code)}</span>
             </p>
             <p style="color:#6b7280;font-size:13px;">Expires in 10 minutes. If you didn't try to sign in, change your password immediately.</p>`,
    }),
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
  });
}

/** Confirmation sent to the OLD address when the account email is changed. */
export async function sendEmailChangeAlert(oldEmail, newEmail) {
  return send({
    to: oldEmail,
    subject: "Your email address was changed",
    html: shell({
      title: "Email address changed",
      body: `<p>The email on your account was changed from <strong>${escapeHtml(oldEmail)}</strong> to <strong>${escapeHtml(newEmail)}</strong>.</p>
             <p>If you did not do this, reset your password immediately and contact us.</p>`,
      cta: button("Reset my password", `${FRONTEND_URL}/forgot-password`),
    }),
    text: `Your account email was changed to ${newEmail}. If this wasn't you, reset your password: ${FRONTEND_URL}/forgot-password`,
  });
}

// ── Commerce emails ───────────────────────────────────────────────────────────

const itemsTable = (items) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border-collapse:collapse;">
  ${(items || [])
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;">
          ${escapeHtml(i.name)}${i.size ? ` <span style="color:#9ca3af;">(${escapeHtml(i.size)})</span>` : ""}
          ${i.color ? ` <span style="color:#9ca3af;">· ${escapeHtml(i.color)}</span>` : ""}
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid #eee;font-size:14px;white-space:nowrap;">×${i.qty} &nbsp; ₹${Number(i.price).toLocaleString("en-IN")}</td>
      </tr>`
    )
    .join("")}
</table>`;

const moneyRow = (label, value) =>
  value ? `<tr><td style="padding:4px 0;color:#6b7280;font-size:14px;">${label}</td><td align="right" style="padding:4px 0;font-size:14px;">₹${Number(value).toLocaleString("en-IN")}</td></tr>` : "";

const totalsTable = (order) => `
<table role="presentation" width="100%" style="margin:6px 0 0;border-collapse:collapse;">
  ${moneyRow("Subtotal", order.itemsPrice)}
  ${order.shippingPrice ? moneyRow(`Delivery${order.shippingMethodLabel ? ` (${escapeHtml(order.shippingMethodLabel)})` : ""}`, order.shippingPrice) : moneyRow("Delivery", 0)}
  ${order.discountPrice ? `<tr><td style="padding:4px 0;color:#059669;font-size:14px;">Discount${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ""}</td><td align="right" style="padding:4px 0;color:#059669;font-size:14px;">− ₹${Number(order.discountPrice).toLocaleString("en-IN")}</td></tr>` : ""}
  <tr><td style="padding:9px 0 0;font-weight:700;font-size:16px;border-top:2px solid #e5e7eb;">Total</td><td align="right" style="padding:9px 0 0;font-weight:700;font-size:16px;border-top:2px solid #e5e7eb;">₹${Number(order.totalPrice).toLocaleString("en-IN")}</td></tr>
</table>`;

/**
 * Order confirmation.
 *
 * Setting the delivery window explicitly is the highest-value line in the whole
 * post-purchase sequence — research consistently finds that "uncertain about
 * delivery reliability" is a top-three abandonment driver, and a committed
 * date/window converts roughly twice as well as a vague promise.
 */
export async function sendOrderConfirmation(order, user) {
  const url = `${FRONTEND_URL}/order/${order._id}`;
  const eta = order.estimatedDelivery || "4-6 business days";
  const pay = order.paymentMethod === "COD";
  return send({
    to: user.email,
    subject: `Order ${order.orderNumber || order._id} confirmed — arriving by ${eta}`,
    html: shell({
      title: `Thank you, ${order.shippingAddress?.fullName || user.name}!`,
      body: `<p>Your order is confirmed. We're getting it packed now.</p>
        ${itemsTable(order.orderItems)}
        ${totalsTable(order)}
        <table role="presentation" style="margin:18px 0;background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;width:100%;">
          <tr><td style="padding:14px 16px;font-size:14px;">
            <strong style="color:${BRAND_COLOR};">Estimated delivery: ${escapeHtml(eta)}</strong><br>
            <span style="color:#4b5563;font-size:13px;">${
              pay
                ? `Pay ₹${Number(order.totalPrice).toLocaleString("en-IN")} in cash when it arrives. No advance payment needed.`
                : "Paid online — no payment needed on delivery."
            }</span>
          </td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px;">Delivering to: ${escapeHtml(order.shippingAddress?.address || "")}, ${escapeHtml(order.shippingAddress?.city || "")} ${escapeHtml(order.shippingAddress?.postalCode || "")}</p>`,
      cta: button("Track my order", url),
    }),
    text: `Order ${order.orderNumber} confirmed. Estimated delivery ${eta}. Track: ${url}`,
  });
}

/** Shipment / delivery progress update. */
export async function sendOrderStatusUpdate(order, user, status) {
  const url = `${FRONTEND_URL}/order/${order._id}`;
  const copy = {
    Packed: ["Your order is packed", "Packed and ready. It leaves our workshop shortly."],
    Shipped: ["Your order has shipped", `Shipped${order.courierName ? ` via ${order.courierName}` : ""}${order.trackingNumber ? ` — AWB ${order.trackingNumber}` : ""}.`],
    "Out for Delivery": ["Out for delivery today", "Our courier is on the way. Please keep ₹" + Number(order.totalPrice).toLocaleString("en-IN") + " ready if you chose Cash on Delivery."],
    Delivered: ["Delivered — we hope you love it", "Your order has been delivered. If it isn't right, tell us within 7 days and we'll make it easy."],
  }[status];
  if (!copy) return false;

  const [title, line] = copy;
  return send({
    to: user.email,
    subject: `${order.orderNumber} — ${title}`,
    html: shell({
      title,
      body: `<p>Hi ${escapeHtml(user.name)},</p><p>${escapeHtml(line)}</p>
             ${itemsTable(order.orderItems)}`,
      cta: button("View order", url),
    }),
    text: `${order.orderNumber}: ${title}. ${line} Track: ${url}`,
  });
}

export async function sendCancellationEmail(order, user) {
  const url = `${FRONTEND_URL}/order/${order._id}`;
  const refundLine = order.refundStatus === "Refunded"
    ? `<p style="margin-top:10px;">Refund of <strong>₹${Number(order.refundAmount).toLocaleString("en-IN")}</strong> has been initiated to your original payment method. UPI refunds usually reach your account within 24 hours.</p>`
    : "";
  return send({
    to: user.email,
    subject: `${order.orderNumber} cancelled`,
    html: shell({
      title: "Your order is cancelled",
      body: `<p>Hi ${escapeHtml(user.name)}, your order <strong>${escapeHtml(order.orderNumber)}</strong> has been cancelled.</p>${refundLine}`,
      cta: button("View order", url),
    }),
    text: `Order ${order.orderNumber} cancelled. ${order.refundStatus === "Refunded" ? `Refund of Rs ${order.refundAmount} initiated.` : ""} ${url}`,
  });
}

export async function sendRefundEmail(order, user, amount) {
  const url = `${FRONTEND_URL}/order/${order._id}`;
  return send({
    to: user.email,
    subject: `Refund processed — ₹${Number(amount).toLocaleString("en-IN")}`,
    html: shell({
      title: "Your refund is on the way",
      body: `<p>Hi ${escapeHtml(user.name)}, we've processed a refund of <strong>₹${Number(amount).toLocaleString("en-IN")}</strong> for order ${escapeHtml(order.orderNumber)}.</p>
             <p>It will reach your original payment method. UPI refunds typically land within 24 hours; card refunds can take 5-7 working days.</p>`,
      cta: button("View order", url),
    }),
    text: `Refund of Rs ${amount} processed for order ${order.orderNumber}. ${url}`,
  });
}

/** Back-in-stock alert. This is what makes the "notify me" form on the PDP real. */
export async function sendBackInStockEmail(email, product) {
  const url = `${FRONTEND_URL}/product/${product._id}`;
  return send({
    to: email,
    subject: `${product.name} is back in stock`,
    html: shell({
      title: "It's back!",
      body: `<p>Good news — the item you asked about is available again:</p>
        <p style="margin:16px 0;"><strong style="font-size:16px;">${escapeHtml(product.name)}</strong><br>
        <span style="font-size:20px;color:${BRAND_COLOR};font-weight:700;">₹${Number(product.discountedPrice ?? product.price).toLocaleString("en-IN")}</span></p>
        <p style="color:#6b7280;font-size:13px;">Stock is limited and handloom pieces are often one-of-a-kind.</p>`,
      cta: button("Shop it now", url),
    }),
    text: `${product.name} is back in stock: ${url}`,
  });
}

/** Post-delivery review request. The cheapest trust signal to build up. */
export async function sendReviewRequestEmail(order, user) {
  const url = `${FRONTEND_URL}/order/${order._id}`;
  return send({
    to: user.email,
    subject: `How did we do? Your review helps other families`,
    html: shell({
      title: "How was your order?",
      body: `<p>Hi ${escapeHtml(user.name)}, your order ${escapeHtml(order.orderNumber)} was delivered. If you have a moment, tell other shoppers what arrived.</p>
             <p style="color:#6b7280;font-size:13px;">If something wasn't right, reply to this email first — we'll make it right before you worry about a review.</p>`,
      cta: button("Leave a review", url),
    }),
    text: `How was order ${order.orderNumber}? Leave a review: ${url}`,
  });
}

/** Contact-form submission to the business inbox. */
export async function sendContactFormEmail({ name, email, subject, message }) {
  return send({
    to: SUPPORT_EMAIL,
    replyTo: email,
    subject: `[Website enquiry] ${subject}`,
    html: shell({
      title: "New website enquiry",
      body: `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
             <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
             <hr style="border:none;border-top:1px solid #eee;margin:18px 0;">
             <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>`,
    }),
    text: `From: ${name} <${email}>\nSubject: ${subject}\n\n${message}`,
  });
}

export { send as sendEmail };
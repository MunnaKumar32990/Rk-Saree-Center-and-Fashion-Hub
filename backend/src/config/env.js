/**
 * env.js — boot-time configuration assertions.
 *
 * The server previously started happily with a placeholder JWT_SECRET. If
 * `.env.example` was copied to `.env` and the values left alone, anyone could
 * forge an admin token — and nothing would warn until a breach.
 *
 * Failing fast at boot is far better than discovering this in production.
 */

/**
 * Values that actually shipped in the repository's .env.example at some point,
 * or that are obviously hand-written. Matched as exact values or as a substring
 * of the *whole* secret — deliberately NOT as individual short words, because
 * substrings like "test" or "secret" appear inside legitimately generated keys
 * and would reject them.
 */
const EXAMPLE_VALUES = [
  "your_super_secret_jwt_key_here_min_32_chars",
  "replace_me_with_48_random_hex_characters_minimum_32",
  "changeme",
  "please-change-me",
  "your-secret-here",
  "your_secret_here",
  "supersecret",
  "secret123",
];

// Short, guessable secrets that must never be used. Exact match only.
const WEAK_SECRETS = new Set([
  "123456", "12345678", "123456789", "password", "admin", "qwerty",
  "abc123", "letmein", "iloveyou", "testtest",
]);

/** Entropy floor: a real key should be long and not be a dictionary word. */
const isWeak = (value) => {
  const lower = value.toLowerCase();
  if (WEAK_SECRETS.has(lower)) return true;
  return EXAMPLE_VALUES.some((e) => lower === e || lower.includes(e));
};

export function validateEnv() {
  const errors = [];
  const warnings = [];

  if (!process.env.MONGO_URI) {
    errors.push("MONGO_URI is required");
  }

  const secret = process.env.JWT_SECRET || "";
  if (!secret) {
    errors.push("JWT_SECRET is required");
  } else if (secret.length < 32) {
    errors.push(`JWT_SECRET must be at least 32 characters (got ${secret.length})`);
  } else if (isWeak(secret)) {
    errors.push(
      "JWT_SECRET is a known example or weak value. Generate a real one with:\n" +
        "      node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
    );
  }

  if (process.env.FRONTEND_URL?.includes("your-")) {
    warnings.push("FRONTEND_URL still looks like a placeholder — CORS will reject real origins");
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    warnings.push("EMAIL_USER/EMAIL_PASS not set — order and password emails will not send");
  }
  if (process.env.EMAIL_PASS && EXAMPLE_VALUES.some((p) => process.env.EMAIL_PASS.includes(p))) {
    errors.push("EMAIL_PASS is still the example value");
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
    warnings.push("Razorpay not configured — only Cash on Delivery will be available");
  } else if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    /**
     * Hard error, not a warning. Without this secret the /api/webhooks/razorpay
     * handler cannot verify the provider's HMAC, so the endpoint accepts forged
     * `payment.captured` events — which marks unpaid orders as paid. Running
     * online payments without webhook verification is not a degraded state, it
     * is an unauthenticated "mark as paid" API.
     */
    errors.push(
      "RAZORPAY_WEBHOOK_SECRET is required when Razorpay is configured.\n" +
        "      Take it from Razorpay Dashboard -> Settings -> Webhooks."
    );
  }

  if (process.env.COD_CONFIRM_ENABLED === "true") {
    if (!process.env.WHATSAPP_API_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      warnings.push(
        "COD_CONFIRM_ENABLED is true but WhatsApp credentials are missing — COD confirmation will fall back to email"
      );
    }
    if (!process.env.WHATSAPP_APP_SECRET) {
      /**
       * Also a hard error. The inbound WhatsApp handler previously guarded with
       * `if (appSecret && !verify(...))`, so an unset secret short-circuited the
       * check and every request was accepted — anyone could cancel a customer's
       * pending COD order by posting their phone number and the text "CANCEL".
       */
      errors.push(
        "WHATSAPP_APP_SECRET is required when COD_CONFIRM_ENABLED=true.\n" +
          "      Without it inbound messages cannot be authenticated and must be rejected."
      );
    }
  }

  if (errors.length > 0) {
    const err = new Error(
      `Invalid configuration:\n  - ${errors.join("\n  - ")}`
    );
    throw err;
  }

  warnings.forEach((w) => console.warn(`[config] ${w}`));
}

export default validateEnv;
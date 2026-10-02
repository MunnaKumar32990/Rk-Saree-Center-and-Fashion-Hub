import crypto from "crypto";

/**
 * Single-use token handling.
 *
 * Reset and email-verification links are bearer credentials: whoever holds one
 * can take over the account or confirm an address. Storing them in plaintext
 * means that read access to the `users` collection — a leaked read-only
 * credential, a backup dump, an over-broad Atlas role — yields directly
 * usable tokens. Hashing at rest means a database leak is not an account
 * compromise.
 *
 * The raw token is emailed; only the SHA-256 digest is persisted. SHA-256 is
 * appropriate here (unlike for passwords) because the input is 32 bytes of
 * cryptographic randomness from `crypto.randomBytes`, so there is nothing to
 * brute-force — rainbow tables don't help against 256 bits of entropy.
 */

export const generateToken = () => crypto.randomBytes(32).toString("hex");

/** Digest a raw token for storage/comparison. */
export const hashToken = (raw) =>
  crypto.createHash("sha256").update(String(raw)).digest("hex");

/** Constant-time digest comparison. */
export const tokensMatch = (raw, storedHash) => {
  if (!raw || !storedHash) return false;
  const a = Buffer.from(hashToken(raw), "utf8");
  const b = Buffer.from(String(storedHash), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

export const nowPlus = (ms) => new Date(Date.now() + ms);

export const isExpired = (date) => !date || new Date(date).getTime() <= Date.now();

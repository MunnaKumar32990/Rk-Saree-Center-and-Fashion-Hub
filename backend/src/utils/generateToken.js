import jwt from "jsonwebtoken";
import crypto from "crypto";

/**
 * generateToken.js
 *
 * Hardening over the original:
 *  - Algorithm is pinned. jsonwebtoken defaults to HS256 and restricts verify to
 *    HS*, so this wasn't exploitable, but pinning removes the class entirely.
 *  - `iss`/`aud` are set and verified, so a token minted for another service
 *    sharing the secret can't be replayed here.
 *  - `jti` gives every token a unique id for revocation/deduplication.
 *  - Expiry cut from 7 days to 24 hours. There is no refresh-token flow, so a
 *    long expiry means a stolen localStorage token is a week of access. Combined
 *    with `tokenVersion` revocation and the new logout endpoint, 24h is the
 *    right trade-off for a small shop.
 */
const TOKEN_TTL = process.env.JWT_EXPIRES_IN || "24h";

const ISSUER = "rk-saree-api";
const AUDIENCE = "rk-saree-web";

const generateToken = (id, tokenVersion = 0) =>
  jwt.sign(
    { id, tokenVersion, jti: crypto.randomUUID() },
    process.env.JWT_SECRET,
    {
      expiresIn: TOKEN_TTL,
      algorithm: "HS256",
      issuer: ISSUER,
      audience: AUDIENCE,
    }
  );

/** Verify with the same constraints used when signing. */
const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: ISSUER,
    audience: AUDIENCE,
  });

export { TOKEN_TTL };
export { verifyToken };
export default generateToken;
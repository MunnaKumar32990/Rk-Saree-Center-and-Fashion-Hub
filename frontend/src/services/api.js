import axios from "axios";
import { readToken, clearUser } from "../utils/storage";

/**
 * api.js — the single HTTP client.
 *
 * Key fixes over the original:
 *
 * 1. `JSON.parse(localStorage.userInfo)` in the request interceptor could throw
 *    and reject *every* request in the app. Reads now go through
 *    `readToken()`, which cannot throw.
 *
 * 2. The 401 handler used to `localStorage.removeItem("cartItems")`. An expired
 *    token on the checkout page silently emptied the customer's basket
 *    mid-purchase — the single most costly line in the file. The cart is now
 *    never touched by the interceptor.
 *
 * 3. It used `window.location.href = "/login"`, a full page reload that discards
 *    all SPA state and leaves the user with no idea what happened. It now
 *    redirects in-app with a `next` parameter, so login returns them to exactly
 *    where they were.
 *
 * 4. No request timeout. A hung request left spinners spinning forever on slow
 *    mobile connections (the normal case for this audience).
 *
 * 5. `VITE_API_URL` silently falling back to `http://localhost:5000/api` means a
 *    production build with no env var ships a bundle that cannot reach the API
 *    at all — no build error, no runtime warning. `vite.config.js` now fails the
 *    build; this logs loudly in development.
 */

const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

if (!import.meta.env.VITE_API_URL && import.meta.env.PROD) {
  console.error(
    "[api] VITE_API_URL is not set — this bundle will not reach the server. " +
      "Set it in your deployment environment."
  );
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  // Indian mobile networks stall; without this a request can hang indefinitely.
  timeout: 20000,
});

// ── Request: attach the bearer token ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = readToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/** Endpoints where a 401 means "that login was wrong", not "session expired". */
const isAuthAttempt = (url = "") =>
  url.includes("/users/login") ||
  url.includes("/users/register") ||
  url.includes("/users/reset-password") ||
  url.includes("/users/2fa/verify");

// ── Response: handle session expiry without destroying the cart ──────────────
let sessionExpiryNotified = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    if (status === 401 && !isAuthAttempt(url)) {
      clearUser();
      sessionExpiryNotified = true;

      const onLogin =
        window.location.pathname === "/login" || window.location.pathname === "/register";

      if (!onLogin) {
        const next = encodeURIComponent(
          window.location.pathname + window.location.search
        );
        // Soft navigation so the SPA isn't torn down mid-session.
        window.history.replaceState({}, "", `/login?expired=1&next=${next}`);
        window.dispatchEvent(new CustomEvent("auth:session-expired"));
      }
    }

    if (status === 429) {
      error.friendlyMessage =
        error.response?.data?.message ||
        "Too many attempts. Please wait a moment and try again.";
    }

    if (!error.response) {
      error.friendlyMessage =
        error.code === "ECONNABORTED"
          ? "That took too long. Please check your connection and try again."
          : "We can't reach the store right now. Please check your internet connection.";
    }

    return Promise.reject(error);
  }
);

export { sessionExpiryNotified };
export default api;
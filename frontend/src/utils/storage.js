/**
 * storage.js — safe localStorage access.
 *
 * The single most damaging reliability bug in the original app was an unguarded
 * `JSON.parse(localStorage.getItem("userInfo"))` inside the axios request
 * interceptor. Any corruption of that one key — a partial write, another tab,
 * a browser extension, an older schema — made *every* API call reject before it
 * was even sent, so the home page, category grid, product pages and the
 * announcement banner all went blank at once. There was no ErrorBoundary, so
 * there was no recovery either.
 *
 * Every read in the app now goes through here, which cannot throw.
 */

const memoryFallback = new Map();

const safeStorage = (() => {
  try {
    const probe = "__rk_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    // Private browsing / disabled storage: degrade to in-memory rather than crash.
    return {
      getItem: (k) => (memoryFallback.has(k) ? memoryFallback.get(k) : null),
      setItem: (k, v) => memoryFallback.set(k, String(v)),
      removeItem: (k) => memoryFallback.delete(k),
    };
  }
})();

export const readRaw = (key) => {
  try {
    return safeStorage.getItem(key);
  } catch {
    return null;
  }
};

export const writeRaw = (key, value) => {
  try {
    safeStorage.setItem(key, value);
    return true;
  } catch {
    // Quota exceeded — usually a very large cart. Not worth crashing over.
    return false;
  }
};

export const removeRaw = (key) => {
  try {
    safeStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

/**
 * Read and JSON-parse a key. On any failure the corrupt value is cleared and a
 * fallback is returned — never an exception.
 */
export const readJSON = (key, fallback = null) => {
  const raw = readRaw(key);
  if (raw === null || raw === undefined) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    removeRaw(key);
    return fallback;
  }
};

export const writeJSON = (key, value) => writeRaw(key, JSON.stringify(value));

export const isArray = (value) => Array.isArray(value);

export const KEYS = {
  USER: "userInfo",
  CART: "cartItems",
  ADDRESS: "shippingAddress",
  RECENT: "recentlyViewed",
  LOCATION: "rk_location",
  COOKIE_CONSENT: "rk_cookie_consent",
  COUPON: "rk_applied_coupon",
};

/** @returns {object|null} the stored user, or null */
export const readUser = () => {
  const value = readJSON(KEYS.USER, null);
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
};

/** @returns {string|null} the stored auth token */
export const readToken = () => {
  const user = readUser();
  return typeof user?.token === "string" && user.token ? user.token : null;
};

export const writeUser = (user) => writeJSON(KEYS.USER, user);

export const clearUser = () => removeRaw(KEYS.USER);

/** @returns {Array} a valid cart array — a corrupt value degrades to empty */
export const readCart = () => {
  const value = readJSON(KEYS.CART, []);
  return Array.isArray(value) ? value : [];
};

export const writeCart = (cart) => writeJSON(KEYS.CART, cart);

export default { readRaw, writeRaw, removeRaw, readJSON, writeJSON, readUser, readToken, writeUser, clearUser, readCart, writeCart, KEYS };
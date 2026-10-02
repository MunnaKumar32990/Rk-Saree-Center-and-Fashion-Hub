/**
 * pwa.js — service worker registration + install prompt.
 *
 * A PWA matters more here than in most markets. Roughly 30% of the web is
 * still low-end devices, a Redmi-class phone runs JS about a third as fast as a
 * current flagship, and median mobile blocking time is measured at ~1,900ms vs
 * ~92ms on desktop. An installable, offline-capable shell with a cached app
 * frame is one of the few things that reliably improves repeat visits — and for
 * a saree business the purchase cycle is spiky (wedding and festival season),
 * so an installed icon on the home screen drives the repeat visit.
 *
 * Deliberate detail: the install prompt is NOT shown on first visit. It fires
 * only after real engagement (a completed order, several product views, or a few
 * minutes on the site), because a prompt on first load reads as pushy and gets
 * dismissed permanently.
 */

const SW_URL = "/sw.js";
const INSTALL_PROMPT_EVENT = "rk:install-prompt";

let deferredPrompt = null;
const listeners = new Set();

export const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator.standalone === true);

export const onInstallPromptChange = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

const emit = () => {
  listeners.forEach((cb) => {
    try {
      cb(deferredPrompt);
    } catch {
      /* a listener must never break the install flow */
    }
  });
};

export const registerServiceWorker = () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  if (import.meta.env.DEV) {
    // Vite's own HMR already handles caching in dev; a SW would fight it.
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    emit();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    emit();
    try {
      localStorage.setItem("rk_installed", "1");
    } catch {
      /* storage unavailable — not important enough to fail on */
    }
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(SW_URL, { scope: "/" })
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              import("react-hot-toast").then(({ default: toast }) => {
                toast("A fresh version of the store is ready. Reload to update.", {
                  icon: "✨",
                  duration: 8000,
                  id: "sw-update",
                });
              });
            }
          });
        });
      })
      .catch((err) => console.warn("[pwa] registration failed:", err?.message));
  });
};

/**
 * Show the browser's own install prompt. Returns true if the user accepted.
 * No-ops if the browser has already made the offer.
 */
export const promptInstall = async () => {
  if (!deferredPrompt) return false;
  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    emit();
    return outcome === "accepted";
  } catch {
    return false;
  }
};

export const canPromptInstall = () => Boolean(deferredPrompt) && !isStandalone();

/** Has this visitor already installed the app? */
export const hasInstalled = () => {
  try {
    return localStorage.getItem("rk_installed") === "1" || isStandalone();
  } catch {
    return isStandalone();
  }
};

/**
 * Decide whether the install nudge is appropriate.
 * Returns false for a first visit, which is the documented mistake to avoid.
 */
export const shouldNudgeInstall = ({ visits = 0, productViews = 0, msOnSite = 0, ordered = false } = {}) => {
  if (!canPromptInstall() || hasInstalled()) return false;
  if (ordered) return true; // just bought something — strongest possible moment
  if (productViews >= 5) return true;
  if (visits >= 3 && msOnSite >= 180000) return true;
  return false;
};

// ── Lightweight engagement counters ─────────────────────────────────────────
// Deliberately simple: no third-party analytics, no PII, just enough signal to
// know when to show the nudge.
const COUNTS_KEY = "rk_engagement";

export const recordProductView = () => {
  try {
    const data = JSON.parse(localStorage.getItem(COUNTS_KEY) || '{"views":0,"visits":0}');
    data.views = (data.views || 0) + 1;
    const today = new Date().toDateString();
    if (data.lastVisit !== today) {
      data.visits = (data.visits || 0) + 1;
      data.lastVisit = today;
    }
    localStorage.setItem(COUNTS_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
};

export const getEngagement = () => {
  try {
    const data = JSON.parse(localStorage.getItem(COUNTS_KEY) || "{}");
    return { views: data.views || 0, visits: data.visits || 0 };
  } catch {
    return { views: 0, visits: 0 };
  }
};

export { INSTALL_PROMPT_EVENT };
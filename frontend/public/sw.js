/**
 * sw.js — offline shell + runtime caching.
 *
 * Strategy per resource type:
 *
 *  - App shell (HTML): network-first with a cached fallback. A cached SPA shell
 *    means the store still opens on a bad connection instead of showing a
 *    browser error page — which matters on 4G in tier-2 cities.
 *  - JS/CSS/fonts: stale-while-revalidate. Instant on repeat visits, updated in
 *    the background. Filenames are content-hashed by Vite, so this is safe.
 *  - Images (incl. Cloudinary): cache-first with a long TTL. Product imagery is
 *    the bulk of the page weight and is effectively immutable per URL.
 *  - /api GET: network-first, short TTL. Never cache payments, orders or auth.
 *
 * Deliberately NOT cached: anything under /api that isn't a GET, and any
 * response that isn't 200 — so a failed mutation is never replayed from cache.
 */

const VERSION = "v3";
const SHELL_CACHE = `rk-shell-${VERSION}`;
const ASSET_CACHE = `rk-assets-${VERSION}`;
const IMAGE_CACHE = `rk-images-${VERSION}`;
const DATA_CACHE = `rk-data-${VERSION}`;

const SHELL_URLS = ["/", "/index.html", "/manifest.json", "/offline.html"];

const IMAGE_HOSTS = ["res.cloudinary.com", "images.unsplash.com", "cdnjs.cloudflare.com"];
const API_PATH = "/api";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, ASSET_CACHE, IMAGE_CACHE, DATA_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

const isImage = (url) =>
  IMAGE_HOSTS.includes(url.hostname) || /\.(png|jpe?g|webp|avif|svg|gif)$/i.test(url.pathname);

const isStaticAsset = (url) =>
  url.pathname.startsWith("/assets/") ||
  /\.(js|css|woff2?|ttf|otf|eot)$/i.test(url.pathname);

// Worker scope globals (self, caches, clients, fetch, Response, ...) come from
// the `public/**/*.js` override in eslint.config.js.
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    // Refresh in the background; don't block the response.
    fetch(request)
      .then((res) => {
        if (res?.ok) cache.put(request, res.clone());
      })
      .catch(() => undefined);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response?.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response?.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || (await network) || new Response("", { status: 504 });
}

async function networkFirst(request, cacheName, timeoutMs = 6000) {
  const cache = await caches.open(cacheName);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response?.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline");
  }
}

async function networkFirstShell(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response?.ok) cache.put("/index.html", response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request)) ||
      (await cache.match("/index.html")) ||
      (await cache.match("/offline.html")) ||
      new Response(
        "<!doctype html><meta charset=utf-8><title>Offline</title>" +
          "<body style='font-family:system-ui;padding:2rem;text-align:center'>" +
          "<h1>You're offline</h1><p>Please reconnect and try again.</p></body>",
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never touch non-GET. A cached POST/PUT could replay a payment or a cancel.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin: images only.
  if (url.origin !== self.location.origin) {
    if (isImage(url)) {
      event.respondWith(cacheFirst(request, IMAGE_CACHE));
    }
    return;
  }

  // API: short-lived, network-first. Read-only, non-sensitive GETs only.
  if (url.pathname.startsWith(API_PATH)) {
    if (
      url.pathname.includes("/payment") ||
      url.pathname.includes("/orders") ||
      url.pathname.includes("/users") ||
      url.pathname.includes("/webhooks") ||
      request.headers.get("authorization")
    ) {
      return; // Never cache anything authenticated or financial
    }
    event.respondWith(
      networkFirst(request, DATA_CACHE, 5000).catch(
        () => new Response(JSON.stringify({ message: "You're offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          })
      )
    );
    return;
  }

  // Navigations: shell fallback.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstShell(request));
    return;
  }

  // Images.
  if (isImage(url) || request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Hashed build assets.
  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    return;
  }
});
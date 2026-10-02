import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import dotenv from "dotenv";
import compression from "compression";

dotenv.config();

import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import cspRoutes from "./routes/cspRoutes.js";
import { getSitemap } from "./controllers/productController.js";

import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";
import { rejectMongoOperators } from "./utils/input.js";
import connectDB from "./config/db.js";
import { verifyEmailTransport } from "./utils/emailService.js";
import { sweepUnconfirmedCodOrders, sendCodReminders } from "./utils/codService.js";
import { runAsCronLeader } from "./utils/cronLease.js";
import { validateEnv } from "./config/env.js";

const app = express();
const isProd = process.env.NODE_ENV === "production";

/**
 * TRUST PROXY — must be set before any rate limiter runs.
 *
 * express-rate-limit v8 refuses to honour X-Forwarded-For unless this is
 * configured. Behind Vercel/Render without it, every visitor shares the proxy
 * IP bucket: the 20-login cap became a global outage trigger, and the auth
 * limiter never worked as intended. `1` means "trust exactly one hop".
 */
app.set("trust proxy", 1);
app.disable("x-powered-by");

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Vite injects an inline style tag for the dev overlay; Cloudinary
        // serves all product imagery.
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
        connectSrc: ["'self'", "https://api.postalpincode.in", "https://api.razorpay.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
      },
    },
    hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  next();
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  ...new Set(
    (process.env.FRONTEND_URL || "http://localhost:5173")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean)
  ),
  "http://localhost:5174",
  "https://rk-saree-center-and-fashion-hub.vercel.app",
];

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = same-origin, curl, or a server-side call.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      // Reject SILENTLY. Passing an Error makes the cors package treat it as an
      // application error, so a disallowed Origin produced a 500 with a stack
      // trace instead of a clean CORS refusal. Returning false omits the
      // Access-Control-Allow-Origin header, which is exactly what the browser
      // needs to see — and leaks nothing.
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    // `X-Request-Id` must be allowed or a browser preflight fails for any caller
    // that supplies its own correlation id. `X-No-Compression` is likewise
    // accepted by the compression filter.
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "X-Request-Id",
      "X-No-Compression",
    ],
    maxAge: 86400,
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
// `verify` retains the RAW buffer for webhook signature verification. Both
// providers sign the exact bytes they sent, so re-serialising the parsed body
// would not reproduce the signature. Razorpay was missing this entirely, which
// is why its webhook could not be verified.
const WEBHOOK_PATHS = ["/webhooks/whatsapp", "/webhooks/razorpay"];

app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      if (WEBHOOK_PATHS.some((p) => (req.originalUrl || "").includes(p))) {
        req.rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/**
 * Compression.
 *
 * Catalogue and order payloads are JSON and compress extremely well — a product
 * listing typically shrinks by 70-80%. On the customer side this is the
 * difference between a page that appears on a 4G connection in under a second
 * and one that does not, which matters most for exactly the low-end Android
 * devices this audience uses.
 *
 * The threshold keeps small payloads (health checks, 204s) uncompressed, since
 * framing overhead dominates there and compressing them costs CPU for no gain.
 * `filter` avoids re-compressing images, which Cloudinary already serves as
 * optimised WebP/AVIF — compressing them again wastes CPU and can enlarge them.
 */
app.use(
  compression({
    threshold: 1024,
    // BREACH-style attacks need attacker-controlled data reflected alongside a
    // secret in the same compressed response. This API never reflects a token
    // into a JSON body alongside attacker input, but compressing is skipped for
    // authenticated responses anyway so the risk cannot widen later.
    filter: (req, res) => {
      if (res.getHeader("Content-Encoding")) return false;
      const type = String(res.getHeader("Content-Type") || "");
      if (!/^text\/|application\/(json|javascript|xml)/.test(type)) return false;
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  })
);

/**
 * Request correlation id.
 *
 * When one customer reports "my payment failed" and the request crossed four
 * instances, the only way to find the matching log lines is a shared id. This
 * honours an inbound `X-Request-Id` so an id generated at the edge (load
 * balancer, CDN, or the frontend) survives the whole hop chain, and mints one
 * when there is none.
 *
 * It is echoed back so a support agent can quote it and an operator can grep for
 * it directly.
 */
app.use((req, res, next) => {
  const inbound = req.headers["x-request-id"];
  const id =
    typeof inbound === "string" && /^[\w.:-]{1,128}$/.test(inbound)
      ? inbound
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
});

/**
 * Hardening middleware, applied globally and BEFORE any route runs.
 *
 * `rejectMongoOperators` refuses any request carrying a `$`-prefixed key
 * anywhere in body/query/params. That closes the whole NoSQL-operator-injection
 * class structurally — including for routes added later — on top of the
 * per-field type coercion in utils/input.js.
 */
app.use("/api", rejectMongoOperators);

// ─── Rate limiting ────────────────────────────────────────────────────────────
/**
 * The global cap was 300 requests per 15 minutes keyed by IP. On mobile
 * networks (CGNAT) or any shared office/college IP, that budget was shared
 * across every user, and a normal browse session burns a large fraction of it
 * — so the limiter itself became an outage. It is now generous, and the
 * genuinely expensive endpoints (auth, orders, coupons, payments, reviews,
 * contact) carry their own much tighter limits at the route level.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { message: "Too many requests. Please slow down and try again shortly." },
  standardHeaders: true,
  legacyHeaders: false,
  // The announcement banner is fetched on every page load; it must never be
  // the thing that gets a shopper rate-limited.
  skip: (req) => req.path === "/announcements/active" || req.path === "/products/facets",
});

app.use("/api", apiLimiter);

// ─── Logging ──────────────────────────────────────────────────────────────────
/**
 * Redact secrets that appear in URL paths before anything reaches a log.
 *
 * `POST /api/users/reset-password/<token>` puts a live account-takeover token in
 * the path, and morgan's built-in `combined` format logs `req.originalUrl`
 * verbatim. The previous configuration also had an inverted `skip` predicate —
 * `statusCode < 400 && !path.startsWith("/api")` is false for every /api request,
 * so every single successful API call was logged at full verbosity.
 */
const REDACT_PATHS = /\/(reset-password|verify-email|confirm-email)\/[^/?#]+/g;

// `.token()` registers on the morgan module; `.compile()` consumes it. The order
// matters — compile returns a middleware function, not a formatter with .token().
morgan.token("safe-url", (req) =>
  String(req.originalUrl || req.url).replace(REDACT_PATHS, "/$1/[REDACTED]")
);

// The request id, so a log line can be joined to the customer's report and to
// every other line for the same request across instances.
morgan.token("request-id", (req) => req.id || "-");

// The formatter string is passed to `morgan()` alongside the `skip` option
// rather than pre-compiled, because `morgan.compile()` returns a middleware
// function and would silently drop the failure-only filter — reintroducing the
// very bug this replaces (every successful API call logged at full verbosity).
if (!isProd) {
  app.use(morgan("dev"));
} else {
  // Production: log client and server errors only. Logging every 200 is pure
  // CPU burn at scale and buries the entries that matter. Success volume and
  // latency come from APM and the load balancer instead.
  const failureLog = morgan(
    ':request-id :remote-addr - :method :safe-url :status :res[content-length] - :response-time ms',
    { skip: (req, res) => res.statusCode < 400, stream: process.stderr }
  );

  // Anything 5xx additionally gets the full `combined` format on stderr, so
  // operator alerts carry the user-agent and referrer a triage needs.
  const errorLog = morgan("combined", {
    skip: (req, res) => res.statusCode < 500,
    stream: process.stderr,
  });

  app.use(failureLog);
  app.use(errorLog);
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/sitemap.xml", getSitemap);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/webhooks", webhookRoutes);
// Collector for the frontend's report-only CSP. Mounted before the general
// /api limiter on purpose: browser reports arrive in bursts and none of them
// are abusive, so throttling them would silently discard the violations an
// operator needs in order to switch the policy to enforcing.
app.use("/api/csp-report", cspRoutes);

/**
 * Health check. Now includes database liveness — a platform can only detect a
 * dead Mongo connection if something reports it. `GET /` used to return "OK"
 * even with the database down, which meant a green health check on a broken site.
 */
app.get("/api/health", (_req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting", "unknown"];
  const dbState = states[mongoose.connection.readyState] || "unknown";
  const healthy = dbState === "connected";
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    service: "rk-saree-api",
    database: dbState,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (_req, res) => {
  res.json({ message: "RK Saree & Fashion Hub API", status: "running" });
});

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Bootstrap ────────────────────────────────────────────────────────────────
/**
 * Process-level handlers. Express 5 terminates the process on an unhandled
 * rejection by default, so without these a single stray promise takes the whole
 * server down.
 */
process.on("unhandledRejection", (reason) => {
  console.error("[fatal] Unhandled promise rejection:", reason);
  // Log and keep serving: one bad request must not become an outage.
});
process.on("uncaughtException", (err) => {
  console.error("[fatal] Uncaught exception:", err);
  process.exit(1); // undefined state — a clean exit is safer than limping on
});

async function start() {
  try {
    validateEnv();
  } catch (err) {
    console.error(`[config] ${err.message}`);
    process.exit(1);
  }

  await connectDB();

  // Verify mail credentials once here instead of on every request.
  verifyEmailTransport().catch(() => {});

  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(
      `\n🚀 API ready on port ${PORT} (${process.env.NODE_ENV || "development"})\n`
    );
  });

  server.on("error", (err) => {
    console.error("[server] listen error:", err);
    process.exit(1);
  });

  /**
   * COD hygiene jobs.
   *
   * These implement the documented escalation ladder for unconfirmed Cash on
   * Delivery orders: nudge at 12 hours, release at 24 hours. Ethnic wear RTO
   * runs 30-45%, and every unreleased order is ₹180-500 of dead logistics cost.
   */
   const SWEEP_INTERVAL_MS = 30 * 60 * 1000;
   setInterval(() => {
     // Leader-gated: every instance ticks, but only the lease holder does work.
     // Without this, N instances means N duplicate WhatsApp reminders per
     // customer and N competing release passes.
     runAsCronLeader("cod.sweep", 10 * 60 * 1000, sweepUnconfirmedCodOrders)
       .then(({ leader, result }) => {
         if (leader && result?.cancelled > 0) {
           console.log(`[cod] released ${result.cancelled} unconfirmed order(s)`);
         }
       })
       .catch((e) => console.error("[cod] sweep failed:", e?.message || e));
   }, SWEEP_INTERVAL_MS).unref?.();

   setInterval(() => {
     runAsCronLeader("cod.reminders", 30 * 60 * 1000, sendCodReminders)
       .then(({ leader, result }) => {
         if (leader && result?.sent > 0) console.log(`[cod] sent ${result.sent} reminder(s)`);
       })
       .catch((e) => console.error("[cod] reminders failed:", e?.message || e));
   }, 2 * 60 * 60 * 1000).unref?.();

   // Run once shortly after boot so nothing queued while down is left hanging.
   setTimeout(() => {
     runAsCronLeader("cod.sweep.boot", 5 * 60 * 1000, sweepUnconfirmedCodOrders).catch(() => {});
     runAsCronLeader("cod.reminders.boot", 5 * 60 * 1000, sendCodReminders).catch(() => {});
   }, 15_000).unref?.();

  const shutdown = (signal) => {
    console.log(`\n${signal} received — shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref?.();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start();

export default app;
/** 404 handler — must be registered after all routes. */
export const notFound = (req, _res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
};

const isProd = process.env.NODE_ENV === "production";

/**
 * Centralized error handler.
 *
 * Fixes:
 *  - `res.headersSent` guard. A handler that throws after `res.json()` used to
 *    make this call `res.status()` on an already-sent response, producing
 *    ERR_HTTP_HEADERS_SENT and masking the original error.
 *  - Duplicate-key errors no longer leak the field name in production (it
 *    revealed the internal schema).
 *  - Mongo/network failures return a generic message instead of raw driver text,
 *    which can contain query fragments.
 *  - Unhandled non-Error throws get a sane fallback message.
 */
export const errorHandler = (err, req, res, _next) => {
  if (res.headersSent) {
    return;
  }

  /**
   * Status resolution order:
   *   1. err.status      — set explicitly by validation helpers
   *   2. res.statusCode  — the codebase's `res.status(400); throw ...` idiom
   *   3. err.statusCode
   *
   * Reading `res.statusCode` matters: handlers throughout this codebase set the
   * status on the response and then throw, so a handler that only consulted
   * `err.status` turned every one of those into a 500 and lost the real reason.
   */
  let statusCode =
    err.status ||
    (res.statusCode && res.statusCode !== 200 ? res.statusCode : 0) ||
    err.statusCode ||
    500;
  let message = err.message || "Something went wrong";
  let code = err.code;

  // Mongoose: malformed ObjectId
  if (err.name === "CastError") {
    statusCode = err.kind === "ObjectId" ? 404 : 400;
    message = err.kind === "ObjectId" ? "Resource not found" : "Invalid identifier";
  }

  // Mongo: duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message =
      field === "email"
        ? "That email is already registered"
        : field === "code"
          ? "That coupon code already exists"
          : "That value is already in use";
  }

  // Mongoose: schema validation
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(". ");
  }

  // Mongoose: document failed a custom validator
  if (err.name === "MongooseError") {
    statusCode = 400;
  }

  // Mongo server / connectivity — never surface driver internals
  if (err.name === "MongoServerSelectionError" || err.name === "MongoNetworkError") {
    statusCode = 503;
    message = "We're having trouble reaching the store. Please try again in a moment.";
  }

  // Body parser
  if (err.type === "entity.too.large") {
    statusCode = 413;
    message = "That request is too large";
  }
  if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Malformed request body";
  }

  // Stock conflict carries structured detail the frontend can act on.
  if (err.code === "OUT_OF_STOCK") {
    statusCode = 409;
  }

  if (statusCode >= 500) {
    console.error("[error]", err);
    if (isProd) {
      message = "Something went wrong on our end. Please try again.";
    }
  }

  res.status(statusCode).json({
    message,
    ...(code ? { code } : {}),
    ...(err.available !== undefined ? { available: err.available } : {}),
    ...(!isProd ? { stack: err.stack } : {}),
  });
};
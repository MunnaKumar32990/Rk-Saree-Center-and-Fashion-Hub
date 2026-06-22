// 404 Not Found handler
export const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

// Centralized Error Handler
export const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    // Mongoose bad ObjectId
    if (err.name === "CastError" && err.kind === "ObjectId") {
        statusCode = 404;
        message = "Resource not found";
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        statusCode = 400;
        message = `Duplicate field value: ${Object.keys(err.keyValue).join(", ")}`;
    }

    // Mongoose validation error
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(err.errors)
            .map((e) => e.message)
            .join(", ");
    }

    res.status(statusCode).json({
        message,
        // M5 Fix: Only expose stack in explicit development mode
        stack: process.env.NODE_ENV === "development" ? err.stack : null,
    });
};

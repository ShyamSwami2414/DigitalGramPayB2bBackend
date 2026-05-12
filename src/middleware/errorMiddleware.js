const ErrorLog = require("../models/errorLogModel");
const { logError } = require("../utils/logger");

exports.globalErrorHandler = async (err, req, res, next) => {
  await ErrorLog.create({
    title: "GLOBAL_ERROR",

    message: err.message,

    stack: err.stack,

    route: req.originalUrl,

    method: req.method,

    userId: req.user?.id || null,

    requestBody: req.body,

    params: req.params,

    query: req.query,

    headers: req.headers,

    error: err,

    referenceId: err.referenceId || `ERR-${Date.now()}`,

    service: "B2B_BACKEND",

    environment: process.env.NODE_ENV || "development",
  });

  await logError({
    title: "GLOBAL_ERROR",
    error: err,
    req,
  });

  // mongoose validation
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
    });
  }

  // duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];

    return res.status(400).json({
      success: false,
      message: `${field} '${value}' already exists`,
      field,
    });
  }

  // if (err.code === 112 || err.name === "WriteConflict") {
  //   // This happens when the DB is busy.
  //   // If it reaches here, your retry logic failed.
  //   return res.status(429).json({
  //     success: false,
  //     message:
  //       "System is busy processing your request. Please check your balance in a moment.",
  //   });
  // }

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    data: err.data || null,
  });
};

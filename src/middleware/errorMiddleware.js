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

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

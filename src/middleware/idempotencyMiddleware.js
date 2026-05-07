const mongoose = require("mongoose");
const Idempotency = require("../models/idempotencyModel");

module.exports = async (req, res, next) => {
  try {
    const key = req.headers["idempotency-key"];
    const userId = req.user?.id;

    console.log("userId", userId);
    console.log("idmpotency-key", key);

    if (!key) {
      return res.status(400).json({
        success: false,
        message: "Idempotency-Key required",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User id required",
      });
    }

    // Look for existing key for this user
    let existing = await Idempotency.findOne({ key, userId });

    if (existing) {
      if (existing.status === "completed") {
        console.log("Returned saved response");
        // If request already completed, return stored response
        return res
          .status(existing.responseCode || 200)
          .json({ idempotent: true, ...existing.response });
      } else if (existing.status === "processing") {
        return res.status(409).json({
          success: false,
          message: "Request already in progress",
        });
      }
    }

    try {
      await Idempotency.create({ key, userId, status: "processing" });
    } catch (err) {
      if (err.code === 11000) {
        existing = await Idempotency.findOne({ key, userId });

        if (existing?.status === "completed") {
          return res
            .status(existing.responseCode || 200)
            .json({ idempotent: true, ...existing.response });
        }

        return res.status(409).json({
          success: false,
          message: "Request already in progress",
        });
      }

      throw err; // other errors
    }

    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      try {
        await Idempotency.findOneAndUpdate(
          { key, userId },
          {
            status: "completed",
            response: body,
            responseCode: res.statusCode,
          },
        );
      } catch (err) {
        console.error("Failed to save idempotency response", err);
      }

      return originalJson(body);
    };

    next();
  } catch (err) {
    console.error("Idempotency middleware error", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error (idempotency)",
    });
  }
};

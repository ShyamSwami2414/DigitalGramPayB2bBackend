const mongoose = require("mongoose");

const dailyEkoAepsLoginSchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    userCode: {
      type: String,
      required: true,
    },

    loginDate: {
      type: String, // format: YYYY-MM-DD
      required: true,
      index: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "PENDING",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Ensure one record per user per day
dailyEkoAepsLoginSchema.index({ userId: 1, loginDate: 1 }, { unique: true });

module.exports = mongoose.model("DailyEkoAepsLogin", dailyEkoAepsLoginSchema);

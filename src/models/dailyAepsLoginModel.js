const mongoose = require("mongoose");

const dailyAepsLoginSchema = new mongoose.Schema(
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

    outletId: {
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
dailyAepsLoginSchema.index({ userId: 1, loginDate: 1 }, { unique: true });

module.exports = mongoose.model("DailyAepsLogin", dailyAepsLoginSchema);

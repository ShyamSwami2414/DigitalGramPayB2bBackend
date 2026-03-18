const mongoose = require("mongoose");

const bbpsReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    commission: {
      type: Number,
      default: 0,
    },

    tds: {
      type: Number,
      default: 0,
    },

    netCommission: {
      type: Number,
      default: 0,
    },

    //internal reference id
    referenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Recharge Status
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("BbpsReport", bbpsReportSchema);

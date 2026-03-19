const mongoose = require("mongoose");

const rechargeReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    mobileNumber: {
      type: String,
      required: true,
      index: true,
    },

    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Operator",
      required: true,
    },

    operatorName: {
      type: String,
      required: true,
    },

    circle: {
      type: String,
    },

    amount: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: ["debit", "credit"],
      default: "debit",
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

    isRefunded: {
      type: Boolean,
      default: false,
    },

    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("RechargeReport", rechargeReportSchema);

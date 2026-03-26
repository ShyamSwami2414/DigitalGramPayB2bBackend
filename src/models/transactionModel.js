const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    referenceId: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },

    serviceType: {
      type: String,
      required: true,
      enum: ["RECHARGE", "BBPS", "DMT", "AEPS", "PAYOUT", "WALLETTRANSFER"],
    },

    amount: {
      type: Number,
      required: true,
      default: 0,
    },

    wallet: {
      type: String,
      enum: ["main", "aeps"],
      default: null,
    },

    type: {
      type: String,
      enum: ["debit", "credit"],
      default: null,
    },

    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "PENDING", "REFUNDED"],
      default: "PENDING",
    },

    isRefunded: {
      type: Boolean,
      default: false,
    },

    remark: {
      type: String,
      default: "",
    },

    providerTxnId: {
      type: String,
      unique: true,
      sparse: true,
    },

    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("Transaction", transactionSchema);

const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    txnId: {
      type: String,
      required: true,
      unique: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    serviceType: {
      type: String,
      required: true,
      enum: ["recharge", "bbps", "dmt", "payout", "walletTransfer"],
    },

    amount: {
      type: Number,
      default: 0,
    },

    wallet: {
      type: String,
      enum: ["main", "aeps"],
      default: "none",
    },

    type: {
      type: String,
      enum: ["debit", "credit", "none"],
      default: "none",
    },

    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      default: "success",
    },

    remark: {
      type: String,
      default: "",
    },

    providerTxnId: {
      type: String,
      default: "",
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Transaction", transactionSchema);

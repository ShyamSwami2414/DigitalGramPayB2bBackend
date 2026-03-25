const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
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
      default: null,
    },

    type: {
      type: String,
      enum: ["debit", "credit"],
      default: null,
    },

    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      default: "pending",
    },

    remark: {
      type: String,
      default: "",
    },

    providerTxnId: {
      type: String,
      default: "",
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

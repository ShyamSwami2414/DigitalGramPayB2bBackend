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
      enum: [
        "RECHARGE",
        "BBPS",
        "DMT",
        "AEPS",
        "XPRESS_PAYOUT",
        "AEPS_PAYOUT",
        "WALLET_TRANSFER",
      ],
    },

    serviceCategory: {
      type: String,
      trim: true,
      uppercase: true,
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
      enum: ["INITIATED", "SUCCESS", "FAILED", "PENDING", "REFUNDED"],
      default: "INITIATED",
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
      index: true,
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

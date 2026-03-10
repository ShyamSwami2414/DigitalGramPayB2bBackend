const mongoose = require("mongoose");

const walletLedgerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    serviceType: {
      type: "String",
      enum: ["RECHARGE", "COMMISSION", "REFUND", "BBPS", "DMT"],
      trim: true,
      uppercase: true,
    },

    wallet: {
      type: String,
      enum: ["main", "aeps"],
      required: true,
    },

    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    openingBalance: {
      type: Number,
      required: true,
    },

    closingBalance: {
      type: Number,
      required: true,
    },

    referenceId: {
      type: String,
      required: true,
      index: true,
    },

    description: {
      type: String,
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("WalletLedger", walletLedgerSchema);

const mongoose = require("mongoose");

const payoutTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    serviceType: {
      type: String,
      enum: ["AEPS_PAYOUT", "UPI_PAYOUT", "XPRESS_PAYOUT"],
      required: true,
      index: true,
    },

    //internal
    referenceId: {
      type: String,
      required: true,
      unique: true,
    },

    bankReferenceId: {
      type: String,
      trim: true,
    },

    idempotencyKey: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      sparse: true,
    },

    bankAccount: {
      type: String,
    },

    ifsc: {
      type: String,
    },

    beneficiaryName: {
      type: String,
    },

    beneficiaryPhone: {
      type: String,
    },

    amount: {
      type: Number,
      required: true,
    },

    charge: {
      type: Number,
      default: 0,
    },

    gst: {
      type: Number,
      default: 0,
    },

    tds: {
      type: Number,
      default: 0,
    },

    totalDebit: {
      type: Number,
      required: true,
      // amount + charge + gst + tds
    },

    status: {
      type: String,
      enum: ["INITIATED", "PENDING", "SUCCESS", "FAILED", "REVERSED"],
      default: "INITIATED",
      index: true,
    },

    isRefunded: {
      type: Boolean,
      default: false,
    },

    failureReason: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("PayoutTransaction", payoutTransactionSchema);

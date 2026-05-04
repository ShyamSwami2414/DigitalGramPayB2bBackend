const mongoose = require("mongoose");

const dmtReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    //internal reference id
    referenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NobleDmtFinoCustomer",
      required: true,
      index: true,
    },

    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NobleDmtBeneficiary",
      required: true,
      index: true,
    },

    bankTransactionId: {
      type: String,
      index: true,
    },

    rrn: {
      type: String,
    },

    beneficiaryName: {
      type: String,
      trim: true,
    },

    beneficiaryIfsc: {
      type: String,
      trim: true,
    },

    beneficiaryAccount: {
      type: String,
      trim: true,
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

    // transaction Status
    status: {
      type: String,
      enum: ["INITIATED", "PENDING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "INITIATED",
      index: true,
    },

    message: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("DmtReport", dmtReportSchema);

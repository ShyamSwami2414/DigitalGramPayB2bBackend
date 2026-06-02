const mongoose = require("mongoose");

const ekoAepsReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    userCode: {
      type: String,
      required: true,
      trim: true,
    },

    serviceType: {
      type: String,
      enum: ["WITHDRAWAL", "WITHDRAW", "ENQUIRY", "INQUIRY", "STATEMENT"],
      required: true,
      index: true,
    },

    providerName: {
      type: String,
      default: "EKO",
      index: true,
    },

    //internal reference id
    referenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    //external reference id
    providerTxnId: {
      type: String,
      index: true,
      sparse: true,
    },

    txnStatus: {
      type: String,
      enum: ["SUCCESS", "FAILED", "PENDING", "REFUNDED"],
      index: true,
    },

    amount: {
      type: Number,
      default: 0,
    },

    balance: {
      type: Number,
      default: 0,
    },

    miniStatement: {
      type: Array,
      default: [],
    },

    bankRefNumber: {
      type: String,
    },

    aadhaar: {
      type: String, // masked
    },

    customerName: {
      type: String,
    },

    message: {
      type: String,
    },

    reason: {
      type: String,
    },

    responseTypeId: {
      type: Number,
    },

    rawResponse: {
      type: Object,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("EkoAepsReport", ekoAepsReportSchema);

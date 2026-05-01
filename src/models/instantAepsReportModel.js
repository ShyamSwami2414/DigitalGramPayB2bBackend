const mongoose = require("mongoose");

const instantAepsReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    outletId: {
      type: String,
      required: true,
      trim: true,
    },

    serviceType: {
      type: String,
      enum: ["CASH-WITHDRAW", "BALANCE-INQUIRY", "MINI-STATEMENT"],
      required: true,
      index: true,
    },

    providerName: {
      type: String,
      default: "INSTANT",
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
      unique: true,
      index: true,
      sparse: true,
    },

    txnStatus: {
      type: String,
      enum: ["SUCCESS", "FAILED", "PENDING", "REFUNDED"],
      default: "PENDING",
      index: true,
    },

    //for withdraw
    amount: {
      type: Number,
      default: 0,
    },

    accountBalance: {
      type: Number,
      default: 0,
    },

    miniStatement: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    bankName: {
      type: String,
    },

    aadhaar: {
      type: String, // masked
    },

    message: {
      type: String,
    },

    reason: {
      type: String,
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

module.exports = mongoose.model("IntantAepsReport", instantAepsReportSchema);

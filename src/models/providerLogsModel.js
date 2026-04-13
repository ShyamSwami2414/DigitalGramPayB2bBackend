const mongoose = require("mongoose");

const providerLogsSchema = new mongoose.Schema(
  {
    providerTxnId: {
      type: String,
      unique: true,
      index: true,
      sparse: true,
    },

    serviceCategory: {
      type: String,
      enum: ["RECHARGE", "DMT", "BBPS", "AEPS"],
      required: true,
      uppercase: true,
      trim: true,
    },

    //internal
    referenceId: {
      type: String,
      index: true,
    },

    providerName: {
      type: String,
      required: true,
    },

    endPoint: {
      type: String,
      required: true,
    },

    method: {
      type: String,
      required: true,
    },

    request: {
      type: Object,
      default: {},
    },

    response: {
      type: Object,
      default: {},
    },

    providerStatus: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },

    errorMessage: {
      type: String,
    },

    responseTime: {
      type: Number, // milliseconds
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("ProviderLogs", providerLogsSchema);

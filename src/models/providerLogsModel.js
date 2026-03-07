const mongoose = require("mongoose");

const providerLogsSchema = new mongoose.Schema(
  {
    txnId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    endPoint: {
      type: String,
      required: true,
    },

    method: {
      type: String,
      required: true,
    },

    providerName: {
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
      enum: ["pending", "success", "failed"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("ProviderLogs", providerLogsSchema);

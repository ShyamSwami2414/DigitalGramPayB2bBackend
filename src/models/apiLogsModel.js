const mongoose = require("mongoose");

const apiLogsSchema = new mongoose.Schema(
  {
    endPoint: {
      type: String,
      required: true,
    },

    method: { type: String },

    request: {
      type: Object,
      default: {},
    },

    response: {
      type: Object,
      default: {},
    },

    status: {
      type: String,
      enum: ["pending", "success", "failed"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("ApiLogs", apiLogsSchema);

const mongoose = require("mongoose");

const errorLogSchema = new mongoose.Schema(
  {
    title: String,

    message: String,

    stack: String,

    route: String,

    method: String,

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    requestBody: Object,

    params: Object,

    query: Object,

    headers: Object,

    error: Object,

    referenceId: String,

    service: String,

    environment: String,
  },
  {
    timestamps: true,
    strict: false,
  },
);

module.exports = mongoose.model("ErrorLog", errorLogSchema);
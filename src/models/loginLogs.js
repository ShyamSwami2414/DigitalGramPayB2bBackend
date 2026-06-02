const mongoose = require("mongoose");

const loginLogsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    email: {
      type: String,
      required: true,
    },

    ipAddress: { type: String, required: true },
    longitude: { type: String, required: true },
    latitude: { type: String, required: true },

    device: { type: String, required: true },
    browser: { type: String, required: true },
    os: { type: String, required: true },

    channel: {
      type: String,
      trim: true,
      uppercase: true,
      enum: ["WEB", "MOBILE", "API"],
      default: "WEB",
    },

    isLoginSuccess: { type: Boolean, required: true, default: false },

    loginTime: { type: Date, default: Date.now },
    logoutTime: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("LoginLogs", loginLogsSchema);

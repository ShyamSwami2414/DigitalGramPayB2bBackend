const mongoose = require("mongoose");

const loginLogsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    ipAddress: { type: String, required: true },
    longitude: { type: String, required: true },
    latitude: { type: String, required: true },

    device: { type: String, required: true },
    loginTime: { type: Date, default: Date.now },
    logoutTime: { type: Date, default: null },

}, { timestamps: true, versionKey: false })

module.exports = mongoose.model("LoginLogs", loginLogsSchema);
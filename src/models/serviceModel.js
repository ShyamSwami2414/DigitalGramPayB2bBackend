const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    serviceCode: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false })

module.exports = mongoose.model("Service", serviceSchema);
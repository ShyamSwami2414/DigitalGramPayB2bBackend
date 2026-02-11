const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    roleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
        required: true
    },
    packageCode: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

}, { timestamps: true, versionKey: false })

module.exports = mongoose.model("Package", packageSchema);
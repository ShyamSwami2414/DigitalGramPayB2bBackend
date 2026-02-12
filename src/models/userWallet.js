const mongoose = require("mongoose");

const userWalletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    aepsWallet: { type: Number, required: true, default: 0 },
    wallet: { type: Number, required: true, default: 0 },
    cWallet: { type: Number, required: true, default: 0 },
    holdAmount: { type: Number, required: true, default: 0 },
    holdReason: { type: String, required: true, default: "" },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

}, { timestamps: true, versionKey: false })

module.exports = mongoose.model("UserWallet", userWalletSchema);
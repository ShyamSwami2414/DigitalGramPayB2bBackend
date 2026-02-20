const mongoose = require("mongoose");

const userWalletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        unique: [true, "User wallet already exists"],
        required: [true, "User ID is required"]
    },

    aepsWallet: {
        type: Number,
        default: 0,
        min: [0, "AEPS wallet balance cannot be negative"]
    },

    mainWallet: {
        type: Number,
        default: 0,
        min: [0, "Main wallet balance cannot be negative"]
    },

    aepsHoldAmount: {
        type: Number,
        default: 0,
        min: [0, "AEPS hold amount cannot be negative"]
    },

    mainHoldAmount: {
        type: Number,
        default: 0,
        min: [0, "Main hold amount cannot be negative"]
    },

    aepsHoldReason: {
        type: String,
        default: ""
    },

    mainHoldReason: {
        type: String,
        default: ""
    },

    currency: {
        type: String,
        default: "INR"
    },

    isActive: {
        type: Boolean,
        default: true
    },

    isDeleted: {
        type: Boolean,
        default: false
    },

    deletedAt: {
        type: Date,
        default: null
    },

}, { timestamps: true, versionKey: false })

userWalletSchema.index({ userId: 1 });

module.exports = mongoose.model("UserWallet", userWalletSchema);
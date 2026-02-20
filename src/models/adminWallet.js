const mongoose = require("mongoose");

const adminWalletSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        unique: [true, "Admin wallet already exists"],
        required: [true, "Admin ID is required"]
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

adminWalletSchema.index({ adminId: 1 });

module.exports = mongoose.model("AdminWallet", adminWalletSchema);
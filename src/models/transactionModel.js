const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({

    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },

    type: {
        type: String,
        required: true,
    },

    amount: {
        type: Number,
        default: 0
    },

    wallet: {
        type: String,
        enum: ["main", "aeps"],
        default: "none"
    },

    entryType: {
        type: String,
        enum: ["debit", "credit", "none"],
        default: "none"
    },

    secondaryWallet: {
        type: String,
        default: null
    },

    status: {
        type: String,
        enum: ["success", "failed", "pending"],
        default: "success"
    },

    remark: {
        type: String,
        default: ""
    },

    meta: {
        type: Object,
        default: {}
    },

}, {
    timestamps: true
});

module.exports = mongoose.model("Transaction", transactionSchema);
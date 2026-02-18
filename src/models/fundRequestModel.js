const mongoose = require("mongoose");

const fundRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },

    amount: {
        type: Number,
        required: true,
    },

    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },

}, { timestamps: true, versionKey: false })

module.exports = mongoose.model("FundRequest", fundRequestSchema);
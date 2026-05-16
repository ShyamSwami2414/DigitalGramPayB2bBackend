const mongoose = require("mongoose");

const userWhitelistAccountSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        bankName: {
            type: String,
            required: [true, "Bank name is required"],
            trim: true,
            minlength: [5, "Bank name must be at least 5 characters"],
            maxlength: [100, "Bank name cannot exceed 100 characters"],
        },

        accountHolderName: {
            type: String,
            required: [true, "Account holder name is required"],
            trim: true,
            minlength: [2, "Account holder name too short"],
            maxlength: [100, "Account holder name too long"],
            match: [/^[A-Za-z\s]+$/, "Name can contain only letters and spaces"],
        },

        accountNumber: {
            type: String,
            required: [true, "Account number is required"],
            trim: true,
            unique: [true, "Account number already exists"],
            minlength: [6, "Account number too short"],
            maxlength: [20, "Account number too long"],
            match: [/^[0-9]+$/, "Account number must contain only digits"],
        },

        ifscCode: {
            type: String,
            required: [true, "IFSC code is required"],
            uppercase: true,
            trim: true,
            match: [
                /^[A-Z]{4}0[A-Z0-9]{6}$/,
                "Invalid IFSC code format (Example: SBIN0001234)",
            ],
        },

        chequeImageUrl: {
            type: String,
            required: true,
            trim: true,

        },

        passbookOrBankStatementUrl: {
            type: String,
            required: true,
            trim: true,
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },

        reason: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("UserWhitelistAccount", userWhitelistAccountSchema);

const mongoose = require("mongoose");

const userRequestModel = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 50,
        },

        lastName: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 50,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
        },

        phone: {
            type: String,
            required: true,
            match: [/^[6-9]\d{9}$/, "Invalid Indian phone number"],
        },

        roleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Role",
            required: true,
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },

        rejectionReason: {
            type: String,
            trim: true,
            default: "",
        },

        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        isDeletedAt: { type: Date, default: null },
    },
    { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("UserRequest", userRequestModel);

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        userName: { type: String, required: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
        },

        password: { type: String, required: true },

        phone: { type: String, required: true },

        roleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Role",
            required: true
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
            required: true

        },

        packageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Package",
            required: true
        },

        pin: { type: Number, required: true },

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("User", userSchema);

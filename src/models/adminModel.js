const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        userName: { type: String, required: true },
        phone: { type: String, required: true },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: { type: String, required: true },

        type: {
            type: String,
            default: "admin",
        },

        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Admin", adminSchema);

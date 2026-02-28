const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        label: {
            type: String,
            required: true,
            trim: true
        },

        allowedTypes: {
            type: [String],
            default: ["image/jpeg", "image/png", "application/pdf"]
        },

        maxSizeMB: {
            type: Number,
            default: 5
        },

        isActive: {
            type: Boolean,
            default: true
        }

    },
    {
        timestamps: true,
        versionKey: false
    });

module.exports = mongoose.model("Document", documentSchema);
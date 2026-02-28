const mongoose = require("mongoose");

const fieldSchema = new mongoose.Schema(
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

        type: {
            type: String,
            enum: ["text", "number", "date", "email"],
            required: true
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

module.exports = mongoose.model("Field", fieldSchema);
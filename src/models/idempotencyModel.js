const mongoose = require("mongoose");

const idempotencySchema = new mongoose.Schema(
    {
        fingerprint: {
            type: String,
            required: true,
            unique: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        operation: {
            type: String,
            required: true,
            uppercase: true,
            trim: true
        },

        status: {
            type: String,
            enum: ["processing", "completed", "failed"],
            default: "processing",
        },

        response: Object,

        createdAt: {
            type: Date,
            default: Date.now,
            expires: 86400
        }

    },


    {
        timestamps: true,
        versionKey: false
    });


module.exports = mongoose.model("Idempotency", idempotencySchema);
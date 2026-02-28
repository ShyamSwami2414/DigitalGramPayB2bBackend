const mongoose = require("mongoose");

const serviceRequestSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        offlineServiceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "OfflineService",
            required: true
        },

        formData: {
            type: Object,
            required: true
        },

        documents: {
            type: Object,
            required: true
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        }

    },
    {
        timestamps: true,
        versionKey: false
    });

module.exports = mongoose.model("ServiceRequest", serviceRequestSchema);
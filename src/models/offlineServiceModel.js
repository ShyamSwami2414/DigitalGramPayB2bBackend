const mongoose = require("mongoose");

const offlineServiceSchema = new mongoose.Schema(
    {
        serviceName: {
            type: String,
            required: [true, "Service Name is required"],
            trim: true,
            lowercase: true
        },

        amount: {
            type: Number,
            required: true
        },

        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true,
        },

        serviceImageUrl: {
            type: String,
            default: ''
        },

        requiredFields: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Field"

            }
        ],

        requiredDocuments: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Document"
            }
        ],

        isActive: {
            type: Boolean,
            default: true
        },

        isDeleted: {
            type: Boolean,
            default: false
        },

        deletedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true,
        versionKey: false
    });

module.exports = mongoose.model("OfflineService", offlineServiceSchema);
const mongoose = require("mongoose");

const offlineServiceRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    offlineServiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OfflineService",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    fieldData: [
      {
        _id: false,
        fieldId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Field",
          required: true,
        },

        value: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
      },
    ],

    documentData: [
      {
        _id: false,
        documentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Document",
          required: true,
        },

        fileUrl: {
          type: String,
          required: true,
        },
      },
    ],

    status: {
      type: String,
      enum: ["pending", "processing", "completed"],
      default: "pending",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    adminRemark: {
      type: String,
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model(
  "OfflineServiceRequest",
  offlineServiceRequestSchema,
);

const mongoose = require("mongoose");

const policySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      trim: true,
      enum: ["terms", "privacy", "refund"],
      required: true,
      unique: true,
      index: true,
    },

    siteTitle: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
    },

    policyHeading: {
      type: String,
      trim: true,
      required: true,
    },

    content: {
      type: String, // HTML
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
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

module.exports = mongoose.model("Policy", policySchema);

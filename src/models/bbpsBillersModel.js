const mongoose = require("mongoose");

const bbpsBillersSchema = new mongoose.Schema(
  {
    billerId: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
    },

    billerName: {
      type: String,
      trim: true,
      required: true,
    },

    billerCategory: {
      type: String,
      trim: true,
      required: true,
    },

    blrCoverage: {
      type: String,
      trim: true,
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

module.exports = mongoose.model("BbpsBillers", bbpsBillersSchema);

const mongoose = require("mongoose");

const operatorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      index: true,
    },

    planFetchValue: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      index: true,
    },

    rechargeValue: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      index: true,
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

module.exports = mongoose.model("Operator", operatorSchema);

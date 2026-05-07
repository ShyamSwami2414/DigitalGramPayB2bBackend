const mongoose = require("mongoose");

const globalBankSchema = new mongoose.Schema(
  {
    bankId: {
      type: Number,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    bankName: {
      type: String,
      required: true,
      trim: true,
    },

    ifscAlias: {
      type: String,
      required: true,
      trim: true,
    },

    ifscGlobal: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("GlobalBank", globalBankSchema);

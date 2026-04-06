const mongoose = require("mongoose");

const instantAepsBankSchema = new mongoose.Schema(
  {
    bank_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    iin: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    isAepsEnabled: {
      type: Boolean,
      default: false,
    },

    isAadhaarpayEnabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("InstantAepsBank", instantAepsBankSchema);

const mongoose = require("mongoose");

const nobleAepsBankSchema = new mongoose.Schema(
  {
    bankIn: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    bankName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("NobleAepsBank", nobleAepsBankSchema);

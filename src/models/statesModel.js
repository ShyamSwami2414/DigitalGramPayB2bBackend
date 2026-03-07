const mongoose = require("mongoose");

const stateSchema = new mongoose.Schema(
  {
    circleCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    circleName: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("States", stateSchema);

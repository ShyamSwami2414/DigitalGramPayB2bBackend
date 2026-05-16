const mongoose = require("mongoose");

const ekoStateSchema = new mongoose.Schema(
  {
    stateCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      unique: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    stateCodeForStateCity: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    value: {
      type: Number,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("EkoState", ekoStateSchema);

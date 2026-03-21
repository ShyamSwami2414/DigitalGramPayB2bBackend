const mongoose = require("mongoose");

const stateCitySchema = new mongoose.Schema(
  {
    stateCode: {
      type: Number,
      required: true,
      trim: true,
    },

    stateName: {
      type: String,
      required: true,
      trim: true,
    },

    cityName: {
      type: String,
      required: true,
      trim: true,
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

stateCitySchema.index({ stateCode: 1, cityName: 1 }, { unique: true });

module.exports = mongoose.model("StateCity", stateCitySchema);

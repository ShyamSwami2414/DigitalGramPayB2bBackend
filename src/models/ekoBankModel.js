const mongoose = require("mongoose");

const ekoBankSchema = new mongoose.Schema(
  {
    bankName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    bankCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },

    impsStatus: {
      type: Boolean,
      default: true, 
    },

    neftStatus: {
      type: Boolean,
      default: true, 
    },

    verification: {
      type: Boolean,
      default: false, 
    },

  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("EkoBank", ekoBankSchema);
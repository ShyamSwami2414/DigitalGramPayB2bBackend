const mongoose = require("mongoose");

const sozoAepsPayoutBankSchema = new mongoose.Schema(
  {
    bankId: {
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

    bankCode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      uppercase: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("SozoAepsPayoutBank", sozoAepsPayoutBankSchema);

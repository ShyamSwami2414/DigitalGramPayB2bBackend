const mongoose = require("mongoose");

const nobleDmtBeneficiarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    remitterMobile: {
      type: String,
      required: true,
      match: /^[6-9]\d{9}$/,
    },

    bankName: {
      type: String,
      required: true,
      trim: true,
    },

    ifsc: {
      type: String,
      required: true,
      uppercase: true,
      match: /^[A-Z]{4}0[A-Z0-9]{6}$/,
    },

    accountHolderName: {
      type: String,
      required: true,
      trim: true,
    },

    accountNumber: {
      type: String,
      required: true,
      match: /^[0-9]{9,18}$/,
    },

    beneficiaryMobile: {
      type: String,
      required: true,
      match: /^[6-9]\d{9}$/,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model(
  "NobleDmtBeneficiary",
  nobleDmtBeneficiarySchema,
);

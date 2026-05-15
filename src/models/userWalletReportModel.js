const mongoose = require("mongoose");

const userWalletReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    wallet: {
      type: String,
      required: true,
      enum: ["aeps", "main"],
    },

    amount: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["credit", "debit", "hold", "release"],
    },

    reason: {
      type: String,
      default: "",
    },

    actionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("UserWalletReport", userWalletReportSchema);

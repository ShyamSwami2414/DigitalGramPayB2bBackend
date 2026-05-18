const mongoose = require("mongoose");

const tdsLedgerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    referenceId: {
      type: String,
      required: true,
      index: true,
    },

    commissionAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    //percent
    tdsRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    netCommission: {
      type: Number,
      required: true,
      min: 0,
    },

    tdsAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["pending", "deposited"],
      default: "pending",
      index: true,
    },

    depositedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("TdsLedger", tdsLedgerSchema);

const mongoose = require("mongoose");

const gstLedgerSchema = new mongoose.Schema(
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

    serviceType: {
      type: String,
      enum: ["DMT", "XPRESS_PAYOUT", "AEPS_PAYOUT"], //xpress, aeps both
    },

    chargesAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    //percent
    gstRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 18,
    },

    gstAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    //including gst
    totalCharge: {
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

module.exports = mongoose.model("GstLedger", gstLedgerSchema);

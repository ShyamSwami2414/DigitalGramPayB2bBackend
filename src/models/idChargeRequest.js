const mongoose = require("mongoose");

const idChargeRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    referenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    walletTopupBankId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTopupBank",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    mode: {
      type: String,
      enum: ["upi", "bank", "neft", "imps"],
      required: true,
    },

    utrNumber: {
      type: String,
      required: true,
      unique: [true, "UTR number already exists"],
      index: true,
    },

    paymentDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value <= new Date(); // must not be future
        },
        message: "Payment date cannot be in the future",
      },
    },

    paymentProof: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: "",
    },

    rejectedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("IdCharge", idChargeRequestSchema);

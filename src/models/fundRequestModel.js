const mongoose = require("mongoose");
const round2 = (num) => Math.round(num * 100) / 100;

const fundRequestSchema = new mongoose.Schema(
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
      set: round2,
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

fundRequestSchema.pre("save", function (next) {
  if (this.amount != null) this.amount = round2(this.amount);
  next();
});

// Pre-update hook for query-based updates
fundRequestSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate"],
  function (next) {
    const update = this.getUpdate();

    if (update.$set?.amount != null) {
      update.$set.amount = round2(update.$set.amount);
    }
    if (update.$inc?.amount != null) {
      update.$inc.amount = round2(update.$inc.amount);
    }

    this.setUpdate(update);
    next();
  },
);

module.exports = mongoose.model("FundRequest", fundRequestSchema);

const mongoose = require("mongoose");

const round2 = (num) => Math.round(num * 100) / 100;

const walletLedgerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    serviceType: {
      type: "String",
      enum: [
        "RECHARGE",
        "COMMISSION",
        "REFUND",
        "BBPS",
        "AEPS",
        "DMT",
        "WALLET_REFILL",
        "AEPSTOMAIN",
        "FUNDREQUEST",
      ],
      trim: true,
      uppercase: true,
    },

    wallet: {
      type: String,
      enum: ["main", "aeps"],
      required: true,
    },

    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      set: round2,
    },

    openingBalance: {
      type: Number,
      required: true,
      set: round2,
    },

    closingBalance: {
      type: Number,
      required: true,
      set: round2,
    },

    referenceId: {
      type: String,
      required: true,
      index: true,
    },

    description: {
      type: String,
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

walletLedgerSchema.pre("save", function (next) {
  if (this.amount != null) this.amount = round2(this.amount);
  if (this.openingBalance != null)
    this.openingBalance = round2(this.openingBalance);
  if (this.closingBalance != null)
    this.closingBalance = round2(this.closingBalance);
  next();
});

const numericFields = ["amount", "openingBalance", "closingBalance"];

walletLedgerSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate"],
  function (next) {
    const update = this.getUpdate();
    for (const field of numericFields) {
      if (update.$inc?.[field] != null) {
        update.$inc[field] = Math.round(update.$inc[field] * 100) / 100;
      }
      if (update.$set?.[field] != null) {
        update.$set[field] = Math.round(update.$set[field] * 100) / 100;
      }
    }
    this.setUpdate(update);
    next();
  },
);

module.exports = mongoose.model("WalletLedger", walletLedgerSchema);

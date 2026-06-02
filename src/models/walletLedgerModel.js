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
        "BBPS",
        "AEPS",
        "DMT",
        "AEPS_PAYOUT",
        "XPRESS_PAYOUT",
        "OFFLINE_SERVICE",
      ],
      trim: true,
      uppercase: true,
    },

    serviceCategory: {
      type: "String",
      trim: true,
      uppercase: true,
    },

    entryType: {
      type: "String",
      enum: [
        "COMMISSION",
        "CHARGES",
        "BONUS", //upline earns when doenline pwrform charge based transaction
        "REFUND",
        "PAYOUT",
        "DMT",
        "WALLET_REFILL",
        "AEPS_TO_MAIN",
        "FUND_REQUEST",
        "CREDIT_WALLET",
        "DEBIT_WALLET",
        "ORDER",
        "OFFLINE_SERVICE_REQUEST",
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
    },

    // settledAmount: {
    //   type: Number,
    // },

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

    status: {
      type: String,
      enum: ["INITIATED", "PENDING", "SUCCESS", "FAILED"],
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

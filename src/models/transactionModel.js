const mongoose = require("mongoose");
const round2 = (num) => Math.round(num * 100) / 100;

const transactionSchema = new mongoose.Schema(
  {
    txnId: {
      type: String,
      required: true,
      unique: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    serviceType: {
      type: String,
      required: true,
      enum: ["recharge", "bbps", "dmt", "payout", "walletTransfer"],
    },

    amount: {
      type: Number,
      default: 0,
      set: round2,
    },

    wallet: {
      type: String,
      enum: ["main", "aeps"],
      default: "none",
    },

    type: {
      type: String,
      enum: ["debit", "credit", "none"],
      default: "none",
    },

    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      default: "success",
    },

    remark: {
      type: String,
      default: "",
    },

    providerTxnId: {
      type: String,
      default: "",
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

userWalletSchema.pre("save", function (next) {
  if (this.amount != null) this.amount = round2(this.amount);
  next();
});

transactionSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate"],
  function (next) {
    const update = this.getUpdate();

    if (update.$inc?.amount != null) {
      update.$inc.amount = round2(update.$inc.amount);
    }
    if (update.$set?.amount != null) {
      update.$set.amount = round2(update.$set.amount);
    }

    this.setUpdate(update);
    next();
  },
);

module.exports = mongoose.model("Transaction", transactionSchema);

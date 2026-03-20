const mongoose = require("mongoose");
const round2 = (num) => Math.round(num * 100) / 100;

const rechargeReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    mobileNumber: {
      type: String,
      required: true,
      index: true,
    },

    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Operator",
      required: true,
    },

    operatorName: {
      type: String,
      required: true,
    },

    circle: {
      type: String,
    },

    amount: {
      type: Number,
      required: true,
      set: round2,
    },

    type: {
      type: String,
      enum: ["debit", "credit"],
      default: "debit",
    },

    commission: {
      type: Number,
      default: 0,
      set: round2,
    },

    tds: {
      type: Number,
      default: 0,
      set: round2,
    },

    netCommission: {
      type: Number,
      default: 0,
      set: round2,
    },

    //internal reference id
    referenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Recharge Status
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },

    isRefunded: {
      type: Boolean,
      default: false,
    },

    description: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const numericFields = ["amount", "commission", "tds", "netCommission"];

rechargeReportSchema.pre("save", function (next) {
  for (const field of numericFields) {
    if (this[field] != null) this[field] = round2(this[field]);
  }
  next();
});

rechargeReportSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate"],
  function (next) {
    const update = this.getUpdate();

    for (const field of numericFields) {
      if (update.$inc?.[field] != null) {
        update.$inc[field] = round2(update.$inc[field]);
      }
      if (update.$set?.[field] != null) {
        update.$set[field] = round2(update.$set[field]);
      }
    }
    this.setUpdate(update);
    next();
  },
);

module.exports = mongoose.model("RechargeReport", rechargeReportSchema);

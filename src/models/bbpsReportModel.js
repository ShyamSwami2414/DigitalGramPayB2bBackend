const mongoose = require("mongoose");
const round2 = (num) => Math.round(num * 100) / 100;

const bbpsReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    refId: {
      type: String,
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    customerName: {
      type: String,
      default: "",
    },

    customerMobile: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      default: "",
    },

    billerId: {
      type: String,
      default: "",
    },

    billNumber: {
      type: String,
      default: "",
    },

    billDate: {
      type: String,
      default: "",
    },

    billPeriod: {
      type: String,
      default: "",
    },

    commission: {
      type: Number,
      default: 0,
    },

    tds: {
      type: Number,
      default: 0,
    },

    netCommission: {
      type: Number,
      default: 0,
    },

    //internal reference id
    referenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    //external reference id
    providerTxnId: {
      type: String,
      index: true,
      sparse: true,
    },

    // Recharge Status
    status: {
      type: String,
      enum: ["INITIATED", "PENDING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "INITIATED",
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

bbpsReportSchema.pre("save", function (next) {
  for (const field of numericFields) {
    if (this[field] != null) this[field] = round2(this[field]);
  }
  next();
});

bbpsReportSchema.pre(
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

module.exports = mongoose.model("BbpsReport", bbpsReportSchema);

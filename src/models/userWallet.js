const mongoose = require("mongoose");
const round2 = (num) => Math.round(num * 100) / 100;

const userWalletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: [true, "User wallet already exists"],
      index: true,
      required: [true, "User ID is required"],
    },

    aepsWallet: {
      type: Number,
      default: 0,
      min: [0, "AEPS wallet balance cannot be negative"],
      set: round2,
    },

    mainWallet: {
      type: Number,
      default: 0,
      min: [0, "Main wallet balance cannot be negative"],
      set: round2,
    },

    aepsHoldAmount: {
      type: Number,
      default: 0,
      min: [0, "AEPS hold amount cannot be negative"],
      set: round2,
    },

    mainHoldAmount: {
      type: Number,
      default: 0,
      min: [0, "Main hold amount cannot be negative"],
      set: round2,
    },

    aepsHoldReason: {
      type: String,
      default: "",
    },

    mainHoldReason: {
      type: String,
      default: "",
    },

    currency: {
      type: String,
      default: "INR",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false },
);

userWalletSchema.pre("save", function (next) {
  if (this.aepsWallet != null) this.aepsWallet = round2(this.aepsWallet);
  if (this.mainWallet != null) this.mainWallet = round2(this.mainWallet);
  if (this.aepsHoldAmount != null)
    this.aepsHoldAmount = round2(this.aepsHoldAmount);
  if (this.mainHoldAmount != null)
    this.mainHoldAmount = round2(this.mainHoldAmount);
  next();
});

const numericFields = [
  "mainWallet",
  "mainHoldAmount",
  "aepsWallet",
  "aepsHoldAmount",
];

userWalletSchema.pre(
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

module.exports = mongoose.model("UserWallet", userWalletSchema);

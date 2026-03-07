const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    isUsed: {
      type: Boolean,
      default: false,
    },

    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    usedDate: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isExpired: {
      type: Boolean,
      default: false,
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
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("Coupon", couponSchema);

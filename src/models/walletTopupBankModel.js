const mongoose = require("mongoose");

const walletTopupBankSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: [true, "Admin ID is required"],
      index: true,
    },

    bankName: {
      type: String,
      required: [true, "Bank name is required"],
      trim: true,
      minlength: [5, "Bank name must be at least 5 characters"],
      maxlength: [100, "Bank name cannot exceed 100 characters"],
    },

    accountHolderName: {
      type: String,
      required: [true, "Account holder name is required"],
      trim: true,
      minlength: [2, "Account holder name too short"],
      maxlength: [100, "Account holder name too long"],
    },

    accountNumber: {
      type: String,
      required: [true, "Account number is required"],
      trim: true,
      minlength: [6, "Account number too short"],
      maxlength: [20, "Account number too long"],
      match: [/^[0-9]+$/, "Account number must contain only digits"],
    },

    ifscCode: {
      type: String,
      required: [true, "IFSC code is required"],
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z]{4}0[A-Z0-9]{6}$/,
        "Invalid IFSC code format (Example: SBIN0001234)",
      ],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("WalletTopupBank", walletTopupBankSchema);

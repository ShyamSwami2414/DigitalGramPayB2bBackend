const mongoose = require("mongoose");
const round2 = (num) => Math.round(num * 100) / 100;

const adminWalletSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      unique: [true, "Admin wallet already exists"],
      required: [true, "Admin ID is required"],
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

adminWalletSchema.index({ adminId: 1 });
const numericFields = ["aepsWallet", "mainWallet"];

adminWalletSchema.pre("save", function (next) {
  for (const field of numericFields) {
    if (this[field] != null) this[field] = round2(this[field]);
  }
  next();
});

adminWalletSchema.pre(
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

module.exports = mongoose.model("AdminWallet", adminWalletSchema);

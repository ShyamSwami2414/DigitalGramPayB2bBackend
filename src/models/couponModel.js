const mongoose = require("mongoose");

const round2 = (num) => Math.round(num * 100) / 100;

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 10,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
      set: round2,
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

couponSchema.pre("save", function (next) {
  if (this.amount != null) this.amount = round2(this.amount);
  next();
});

// Pre-update hooks for query-based updates
couponSchema.pre(
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

module.exports = mongoose.model("Coupon", couponSchema);

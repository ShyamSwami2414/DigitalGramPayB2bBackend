const mongoose = require("mongoose");
const round2 = (num) => Math.round(num * 100) / 100;

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      minlength: 3,
      maxlength: 50,
    },

    roleCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    level: {
      type: Number,
      enum: [1, 2, 3, 4],
      required: true,
    },

    onBoardCharge: {
      type: Number,
      required: true,
      min: [0, "OnBoard charge cannot be negative"],
      set: round2,
    },

    isPaymentRequired: {
      type: Boolean,
      default: false,
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

roleSchema.pre("save", function (next) {
  if (this.onBoardCharge != null) {
    this.onBoardCharge = round2(this.onBoardCharge);
  }
  next();
});

roleSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate"],
  function (next) {
    const update = this.getUpdate();
    if (update.$inc?.onBoardCharge != null) {
      update.$inc.onBoardCharge = round2(update.$inc.onBoardCharge);
    }
    if (update.$set?.onBoardCharge != null) {
      update.$set.onBoardCharge = round2(update.$set.onBoardCharge);
    }
    this.setUpdate(update);
    next();
  },
);

module.exports = mongoose.model("Role", roleSchema);

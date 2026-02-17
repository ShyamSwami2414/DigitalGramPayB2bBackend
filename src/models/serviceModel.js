const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },

    serviceCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

serviceSchema.index({ name: 1 });
serviceSchema.index({ serviceCode: 1 });

module.exports = mongoose.model("Service", serviceSchema);

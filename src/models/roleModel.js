const mongoose = require("mongoose");

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
      uppercase: true
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
    },

    

    isActive: {
      type: Boolean,
      default: true
    },

    isDeleted: {
      type: Boolean,
      default: false
    },

    deletedAt: {
      type: Date,
      default: null
    },

  },
  { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("Role", roleSchema);

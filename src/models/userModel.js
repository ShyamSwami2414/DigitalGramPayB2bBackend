const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },

    userName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },

    level: {
      type: Number,
      required: true,
      default: 1,
    },

    parentUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    password: { type: String, required: true },

    phone: {
      type: String,
      required: true,
      match: [/^[6-9]\d{9}$/, "Invalid Indian phone number"],
    },

    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    kycStatus: {
      type: String,
      enum: ["pending", "submitted", "approved", "rejected"],
      default: "pending",
    },

    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      default: null,
    },

    assignedServices: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
    }],

    isPaymentRequired: {
      type: Boolean,
      default: false
    },

    isPaymentDone: {
      type: Boolean,
      default: false
    },

    pin: { type: Number, required: true },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isDeletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("User", userSchema);

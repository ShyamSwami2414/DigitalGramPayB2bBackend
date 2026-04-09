const mongoose = require("mongoose");

const ekoOnboardAepsUserSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      trim: true,
      index: true,
      unique: [true, "User already registered for aeps"],
    },

    userCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
      unique: true,
    },

    initiatorId: {
      type: String,
      required: true,
      trim: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email"],
    },

    mobile: {
      type: String,
      required: true,
      unique: true,
      match: [/^[6-9]\d{9}$/, "Invalid Indian mobile number"],
    },

    panNumber: {
      type: String,
      required: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"],
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    address: {
      line: {
        type: String,
        required: true,
        trim: true,
      },

      city: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      state: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      pincode: {
        type: String,
        required: true,
        match: [/^\d{6}$/, "Invalid pincode"],
      },

      district: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      area: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },
    },

    isActive: {
      type: Boolean,
      default: false,
    },

    // status: {
    //   type: String,
    //   enum: ["PENDING", "APPROVAL-PENDING", "SUCCESS", "VERIFIED", "APPROVED"],
    //   default: "PENDING",
    // },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("EkoOnboardAepsUser", ekoOnboardAepsUserSchema);

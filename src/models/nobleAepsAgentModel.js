const mongoose = require("mongoose");

const nobleAepsAgentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      trim: true,
      index: true,
      unique: [true, "User already onboarded for AEPS"],
    },

    //self
    agentCode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    //provider in reg onboard
    uniqueAgentId: {
      type: String,
      trim: true,
      index: true,
    },

    channel: {
      type: String,
      required: true,
      trim: true,
    },

    //ipv4
    ipAddress: {
      type: String,
      required: true,
      trim: true,
    },

    // Personal Details
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    middleName: {
      type: String,
      default: "",
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    mobileNumber: {
      type: String,
      required: true,
      match: [/^[6-9]\d{9}$/, "Invalid Indian mobile number"],
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email"],
    },

    aadhaar: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      match: [/^\d{12}$/, "Aadhaar must be 12 digits"],
    },

    panNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"],
    },

    dob: {
      type: Date,
      required: true,
    },

    // Residential Address
    address: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    pincode: {
      type: String,
      required: true,
      match: [/^\d{6}$/, "Invalid pincode"],
    },

    // Bank Details
    bankName: {
      type: String,
      required: true,
      trim: true,
    },

    bankAccountNumber: {
      type: String,
      required: true,
      trim: true,
    },

    bankIfsc: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"],
    },

    // Shop Details
    shopName: {
      type: String,
      required: true,
      trim: true,
    },

    shopAddress: {
      type: String,
      required: true,
      trim: true,
    },

    shopState: {
      type: String,
      required: true,
      trim: true,
    },

    shopCity: {
      type: String,
      required: true,
      trim: true,
    },

    shopPincode: {
      type: String,
      required: true,
      match: [/^\d{6}$/, "Invalid shop pincode"],
    },

    shopLongitude: {
      type: Number,
      required: true,
    },

    shopLatitude: {
      type: Number,
      required: true,
    },

    // Status
    isKycDone: {
      type: Boolean,
      default: false,
    },

    isAepsEnabled: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // status: {
    //   type: String,
    //   enum: [
    //     "PENDING",
    //     "APPROVAL-PENDING",
    //     "SUCCESS",
    //     "VERIFIED",
    //     "APPROVED",
    //     "REJECTED",
    //   ],
    //   default: "PENDING",
    // },

    action: {
      type: String,
      default: "",
    },

    // Login & Access
    lastLoginAt: {
      type: Date,
      default: null,
    },

    isLoginRequired: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("NobleAepsAgent", nobleAepsAgentSchema);

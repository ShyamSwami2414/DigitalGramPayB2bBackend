const mongoose = require("mongoose");
const MimeNode = require("nodemailer/lib/mime-node");

const kycSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    firstName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      minLength: 3,
      maxLength: 30,
    },

    lastName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      minLength: 3,
      maxLength: 30,
    },

    fatherName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      minLength: 3,
      maxLength: 50,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, "Invalid Indian phone number"],
    },

    dob: {
      type: Date,
      required: true,
    },

    gender: {
      type: String,
      lowercase: true,
      trim: true,
      enum: ["male", "female", "other"],
      required: true,
    },

    aadharNumber: {
      type: String,
      required: true,
      match: [/^\d{12}$/, "Invalid Aadhaar number"],
    },

    aadharFileUrl: { type: String, required: true },

    panNumber: {
      type: String,
      required: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN number"],
    },

    panFileUrl: { type: String, required: true },

    shopName: { type: String, required: true },
    shopImageUrl: { type: String, required: true },

    businessAddress: {
      address: { type: String, required: true, minLength: 5, maxLength: 100 },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: {
        type: String,
        required: true,
        match: [/^\d{6}$/, "Invalid pincode"],
      },
    },

    businessPanNumber: {
      type: String,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid Business PAN"],
    },

    gstNumber: {
      type: String,
      required: true,
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        "Invalid GST number",
      ],
    },

    accountHolderName: { type: String, required: true },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifscCode: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "submitted", "approved", "rejected"],
      default: "pending",
    },

    rejectionReason: { type: String, default: null },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

kycSchema.index({ status: 1 });
kycSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Kyc", kycSchema);

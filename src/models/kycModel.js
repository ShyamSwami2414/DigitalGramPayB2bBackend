const mongoose = require("mongoose");

const kycSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
      validate: {
        validator: function (value) {
          const today = new Date();

          if (value > today) return false;

          const ageDiff = today.getFullYear() - value.getFullYear();
          const m = today.getMonth() - value.getMonth();

          const age =
            m < 0 || (m === 0 && today.getDate() < value.getDate())
              ? ageDiff - 1
              : ageDiff;

          return age >= 18;
        },
        message:
          "User must be at least 18 years old and DOB cannot be in the future",
      },
    },

    gender: {
      type: String,
      lowercase: true,
      trim: true,
      enum: ["male", "female", "other"],
      required: true,
    },

    personalAddress: {
      address: { type: String, required: true, minLength: 5, maxLength: 100 },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: {
        type: String,
        required: true,
        match: [/^\d{6}$/, "Invalid pincode"],
      },
    },

    personalDetailStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // ---------------------------------------------------

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
      default: null,
    },

    gstNumber: {
      type: String,
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        "Invalid GST number",
      ],
      default: null,
    },

    businessDetailStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    accountHolderName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
      match: [/^[A-Za-z\s.]+$/, "Account holder name can contain only letters"],
    },

    bankName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
      match: [/^[A-Za-z\s.&]+$/, "Invalid bank name"],
    },

    branchName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
      match: [/^[A-Za-z0-9\s().-]+$/, "Invalid branch name"],
    },

    accountNumber: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9]{9,20}$/, "Account number must be 9–20 digits"],
    },

    ifscCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid IFSC code`,
      },
    },

    bankDetailStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
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

    identityDetailStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
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

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
      required: [true, "First name is required"],
      lowercase: true,
      trim: true,
      minLength: [3, "First name must be at least 3 characters"],
      maxLength: [50, "First name cannot exceed 30 characters"],
    },

    lastName: {
      type: String,
      required: [true, "Last name is required"],
      lowercase: true,
      trim: true,
      minLength: [3, "Last name must be at least 3 characters"],
      maxLength: [50, "Last name cannot exceed 30 characters"],
    },

    fatherName: {
      type: String,
      required: [true, "Father name is required"],
      lowercase: true,
      trim: true,
      minLength: [3, "Father's name must be at least 3 characters"],
      maxLength: [50, "Father's name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },

    phone: {
      type: String,
      required: [true, "Mobile Number is required"],
      trim: true,
      match: [/^[6-9]\d{9}$/, "Invalid Indian phone number"],
    },

    dob: {
      type: Date,
      required: [true, "Date of Birth is required"],
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
      required: [true, "Gender is required"],
    },

    personalAddress: {
      address: { type: String, required: true, minLength: 5, maxLength: 100 },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: {
        type: String,
        required: true,
        match: [/^\d{6}$/, "Invalid Personal pincode"],
      },
    },

    personalDetailStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // ---------------------------------------------------

    shopName: {
      type: String,
      required: [true, "Bussiness name is required"],
      minLength: 5,
      maxLength: 100,
    },
    
    shopImageUrl: { type: String, required: true },

    businessAddress: {
      address: { type: String, required: true, minLength: 5, maxLength: 100 },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: {
        type: String,
        required: true,
        match: [/^\d{6}$/, "Invalid Bussiness pincode"],
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
      required: [true, "Account Holder name is required"],
      trim: true,
      minlength: [3, "Account holder name must be at least 3 characters"],
      maxlength: [50, "Account holder name cannot exceed 30 characters"],
      match: [/^[A-Za-z\s.]+$/, "Account holder name can contain only letters"],
    },

    bankName: {
      type: String,
      required: [true, "Bank is required"],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    accountNumber: {
      type: String,
      required: [true, "Account Number is required"],
      trim: true,
      match: [/^[0-9]{9,20}$/, "Account number must be 9-20 digits"],
    },

    ifscCode: {
      type: String,
      required: [true, "Ifsc code required"],
      uppercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid IFSC code`,
      },
    },

    blankChequeUrl: { type: String, required: true },

    bankDetailStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    aadharNumber: {
      type: String,
      required: [true, "Aadhar number is required"],
      match: [/^\d{12}$/, "Invalid Aadhaar number"],
    },

    aadharFileUrl: { type: String, required: true },

    panNumber: {
      type: String,
      required: [true, "Pan number is required"],
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
      enum: ["pending", "approved", "rejected", "rekyc"],
      default: "pending",
    },

    rejectionReason: { type: String, default: null },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    //for approve and reject time
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

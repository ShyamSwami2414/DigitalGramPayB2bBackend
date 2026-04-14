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
    },

    lastName: {
      type: String,
      required: true,
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

    mobile: {
      type: String,
      required: true,
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

    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
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
      },

      state: {
        type: String,
        required: true,
        trim: true,
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
      },

      area: {
        type: String,
        required: true,
        trim: true,
      },
    },

    officeAddress: {
      line: {
        type: String,

        trim: true,
      },

      city: {
        type: String,
        trim: true,
      },

      state: {
        type: String,
        trim: true,
      },

      pincode: {
        type: String,
        match: [/^\d{6}$/, "Invalid pincode"],
      },

      district: {
        type: String,
        trim: true,
      },

      area: {
        type: String,
        trim: true,
      },
    },

    accountNumber: { type: String, default: null },

    bank: { type: String, default: "" },

    ifsc: {
      type: String,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"],
    },

    aadhaar: {
      type: String,
      sparse: true,
      unique: true,
      match: [/^\d{12}$/, "Aadhaar must be 12 digits"],
      index: true,
    },

    deviceNumber: {
      type: String,
      default: "",
    },

    modelName: { type: String, default: "" },

    isActivated: {
      type: Boolean,
      default: false,
    },

    temp_reference_tid: {
      type: String,
      default: null,
    },

    temp_otp_ref_id: {
      type: String,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    isLoginRequired: {
      type: Boolean,
      default: true,
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

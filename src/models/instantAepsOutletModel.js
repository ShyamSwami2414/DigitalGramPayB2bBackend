const mongoose = require("mongoose");

const instantAepsOutletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      trim: true,
      index: true,
      unique: [true, "User already registered for aeps"],
    },

    outletId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      unique: true,
    },

    name: {
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

    aadhaar: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{12}$/, "Aadhaar must be 12 digits"],
    },

    pan: {
      type: String,
      required: true,
      uppercase: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"],
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    gender: {
      type: String,
      enum: ["M", "F", "O"], // Male, Female, Other
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

    profilePic: { type: String, default: null },

    address: {
      address: {
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
      pincode: {
        type: String,
        required: true,
        match: [/^\d{6}$/, "Invalid pincode"],
      },
      state: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isAepsEnabled: {
      type: Boolean,
      default: false,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    isLoginRequired: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVAL-PENDING", "SUCCESS", "VERIFIED", "APPROVED"],
      default: "PENDING",
    },

    action: {
      type: String,
      default: "",
    },

    temp_ref: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("InstantAepsOutlet", instantAepsOutletSchema);

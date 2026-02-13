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

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
    },

    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      default : null
    },

    pin: { type: Number, required: true },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("User", userSchema);

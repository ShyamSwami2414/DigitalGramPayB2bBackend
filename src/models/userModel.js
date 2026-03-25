const mongoose = require("mongoose");
const UserWallet = require("./userWallet");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
      match: [
        /^[A-Za-z\s]+$/,
        "First name can only contain letters and spaces",
      ],
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
      match: [/^[A-Za-z\s]+$/, "Last name can only contain letters and spaces"],
    },

    userName: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
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

    assignedServices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
      },
    ],

    isPaymentDone: {
      type: Boolean,
      default: false,
    },

    pin: { type: Number, required: true },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isDeletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

userSchema.index({ parentUserId: 1 });

userSchema.post("save", async function (doc, next) {
  try {
    const exists = await UserWallet.exists({ userId: doc._id });
    if (!exists) {
      await UserWallet.create({ userId: doc._id });
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("User", userSchema);

const mongoose = require("mongoose");
const AdminWallet = require("./adminWallet");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, minlength: 3, maxlength: 50 },

    userName: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      match: [/^[6-9]\d{9}$/, "Invalid Indian phone number"],
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },

    password: { type: String, required: true },

    type: {
      type: String,
      enum: ["admin", "employee"],
      default: "admin",
      required: true,
    },

    level: {
      type: Number,
      required: true,
      default: 0,
    },

    permissionIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Permission",
        },
      ],
      default: [],
    },
    bio: { type: String, default: "" },

    isActive: { type: Boolean, default: true },

    isDeleted: { type: Boolean, default: false },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

adminSchema.post("save", async function (doc, next) {
  try {
    const exists = await AdminWallet.exists({ adminId: doc._id });
    if (!exists) {
      await AdminWallet.create({ adminId: doc._id });
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Admin", adminSchema);

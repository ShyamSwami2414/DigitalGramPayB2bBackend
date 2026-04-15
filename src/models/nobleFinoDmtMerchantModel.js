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

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      trim: true,
      index: true,
      unique: [true, "User already registered for aeps"],
    },

    // outletId: {
    //   type: String,
    //   required: true,
    //   trim: true,
    //   index: true,
    //   unique: true,
    // },

    name: {
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

    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("InstantAepsOutlet", instantAepsOutletSchema);

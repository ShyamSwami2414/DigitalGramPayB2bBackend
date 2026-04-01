const mongoose = require("mongoose");

const holdReleaseHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    wallet: {
      type: String,
      required: true,
      enum: ["aeps", "main"],
    },

    amount: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["hold", "release"],
    },

    holdReason: {
      type: String,
      required: true,
      default: "",
    },

    holdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },

    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("HoldReleaseHistory", holdReleaseHistorySchema);

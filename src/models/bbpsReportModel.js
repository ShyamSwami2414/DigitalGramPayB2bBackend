const mongoose = require("mongoose");

const bbpsReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    //internal reference id
    referenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Recharge Status
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("BbpsReport", bbpsReportSchema);

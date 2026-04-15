const mongoose = require("mongoose");

const instantAepsLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    type: {
      type: String,
      required: [true, "Type of Transaction is required"],
      enum: [
        "AEPS-ONBOARD",
        "AEPS-KYC-STATUS",
        "AEPS-BIOMETRIC-KYC",
        "AEPS-DAILY-LOGIN",
        "AEPS-CW",
        "AEPS-BAL-INQ",
        "AEPS-MINI-STM",
      ],
    },

    providerTxnId: {
      type: String,
      unique: true,
      index: true,
      sparse: true,
    },

    //internal
    referenceId: {
      type: String,
      index: true,
    },

    providerName: {
      type: String,
      required: true,
    },

    endPoint: {
      type: String,
      required: true,
    },

    method: {
      type: String,
      required: true,
    },

    request: {
      type: Object,
      default: {},
    },

    response: {
      type: Object,
      default: {},
    },

    providerStatus: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },

    errorMessage: {
      type: String,
    },

    responseTime: {
      type: Number, // milliseconds
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("InstantAepsLog", instantAepsLogSchema);

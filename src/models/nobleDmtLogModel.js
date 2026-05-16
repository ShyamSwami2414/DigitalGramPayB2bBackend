const mongoose = require("mongoose");

const nobleDmtLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    type: {
      type: String,
      required: [true, "Type of Transaction is required"],
      enum: [
        "SEARCH-CUSTOMER",
        "CUSTOMER-LIMIT",
        "CUSTOMER-EKYC",
        "REGISTER-OTP",
        "REGISTER-CUSTOMER",
        "T-OTP",
        "FUND-TRANSFER",
        "BEN-ADD",
        "BEN-GET",
        "BEN-DELETE",
      ],
    },

    providerTxnId: {
      type: String,
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

module.exports = mongoose.model("NobleDmtLog", nobleDmtLogSchema);

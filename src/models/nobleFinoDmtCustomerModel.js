const mongoose = require("mongoose");

const nobleFinoDmtCustomerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    customerName: {
      type: String,
      trim: true,
    },

    aadharNumber: {
      type: String,
      trim: true,
    },

    mobile: {
      type: String,
      match: [/^[6-9]\d{9}$/, "Invalid Indian mobile number"],
    },

    ekycRequestId: {
      type: String,
      trim: true,
      sparse: true,
    },

    otpRequestId: { type: String, trim: true },
    tOtpRequestId: { type: String, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

nobleFinoDmtCustomerSchema.index(
  { ekycRequestId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      ekycRequestId: { $exists: true, $ne: null },
    },
  },
);

module.exports = mongoose.model(
  "NobleDmtFinoCustomer",
  nobleFinoDmtCustomerSchema,
);

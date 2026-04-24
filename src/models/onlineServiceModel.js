const mongoose = require("mongoose");

const onlineServiceSchema = new mongoose.Schema(
  {
    serviceName: {
      type: String,
      required: [true, "Service Name is required"],
      trim: true,
      lowercase: true,
    },

    serviceUrl: {
      type: String,
      required: [true, "Service Url is required"],
      trim: true,
      lowercase: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    serviceImageUrl: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("OnlineService", onlineServiceSchema);

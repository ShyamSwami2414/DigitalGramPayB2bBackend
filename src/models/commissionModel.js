const mongoose = require("mongoose");

const commissionSchema = new mongoose.Schema(
  {
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    operatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Operator",
      default: null,
    },

    //bbps category like elctricity, gas etc
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    plan: [
      {
        from: {
          type: Number,
          required: true,
        },

        to: {
          type: Number,
          required: true,
        },

        commission: {
          type: Number,
          required: true,
        },

        type: {
          type: String,
          enum: ["flat", "percent"],
          required: true,
          default: "flat",
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
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("Commission", commissionSchema);

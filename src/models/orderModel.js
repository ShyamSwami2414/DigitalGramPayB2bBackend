const mongoose = require("mongoose");
const round2 = (num) => Math.round(num * 100) / 100;

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    product: {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },

      quantity: {
        type: Number,
        required: true,
      },
    },

    shippingAddress: {
      name: {
        type: String,
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: String,
        required: true,
      },
    },

    subTotal: {
      type: Number,
      required: true,
      set: round2,
    },

    shippingCharge: {
      //100 rupees
      type: Number,
      required: true,
      set: round2,
    },

    gst: {
      //18 %
      type: Number,
      required: true,
      set: round2,
    },

    grandTotal: {
      type: Number,
      required: true,
      set: round2,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },

    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "processing",
    },

    paymentMethod: {
      type: String,
      enum: ["online", "wallet"],
      default: "wallet",
    },

    paymentId: {
      type: String,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const numericFields = ["subTotal", "shippingCharge", "gst", "grandTotal"];

OrderSchema.pre("save", function (next) {
  for (const field of numericFields) {
    if (this[field] != null) this[field] = round2(this[field]);
  }
  next();
});

// Pre-update hook for query-based updates
OrderSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate"],
  function (next) {
    const update = this.getUpdate();

    for (const field of numericFields) {
      if (update.$set?.[field] != null) {
        update.$set[field] = round2(update.$set[field]);
      }
      if (update.$inc?.[field] != null) {
        update.$inc[field] = round2(update.$inc[field]);
      }
    }

    this.setUpdate(update);
    next();
  },
);

module.exports = mongoose.model("Order", OrderSchema);

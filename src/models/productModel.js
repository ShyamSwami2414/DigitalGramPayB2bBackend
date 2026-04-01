const mongoose = require("mongoose");
const { generateSKU } = require("../utils/generateProductSKU");
const round2 = (num) => Math.round(num * 100) / 100;

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    sku: {
      type: String,
      unique: true,
      index: true,
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
      set: round2,
    },

    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
      set: round2,
    },

    priceAfterDiscount: {
      type: Number,
      default: 0,
      min: [0, "Price after discount cannot be negative"],
      set: round2,
    },

    discountType: {
      type: String,
      enum: ["percentage", "flat", "none"],
      default: "none",
    },

    category: {
      type: String,
      required: true,
      enum: ["hardware", "software", "accessories"],
      lowercase: true,
      trim: true,
      index: true,
    },

    stock: {
      type: Number,
      required: [true, "Stock is required"],
      min: [0, "Stock cannot be negative"],
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    productImageUrl: {
      type: String,
      required: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
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

ProductSchema.pre("validate", async function (next) {
  if (!this.sku) {
    this.sku = generateSKU(this.category);
  }
  next();
});

function validateDiscount(discount, discountType, price) {
  if (discountType === "percentage" && discount > 100) {
    throw new Error("Percentage discount cannot exceed 100");
  }

  if (discountType === "flat" && discount > price) {
    throw new Error("Flat discount cannot exceed price");
  }
}

ProductSchema.pre("save", function (next) {
  try {
    validateDiscount(this.discount, this.discountType, this.price);
    next();
  } catch (err) {
    next(err);
  }
});

ProductSchema.pre("findOneAndUpdate", async function (next) {
  try {
    const update = this.getUpdate();

    const doc = await this.model.findOne(this.getQuery());

    const price = update.price ?? doc.price;
    const discount = update.discount ?? doc.discount;
    const discountType = update.discountType ?? doc.discountType;

    validateDiscount(discount, discountType, price);

    next();
  } catch (err) {
    next(err);
  }
});

ProductSchema.pre("updateOne", async function (next) {
  try {
    const update = this.getUpdate();
    const doc = await this.model.findOne(this.getQuery());

    const price = update.price ?? doc.price;
    const discount = update.discount ?? doc.discount;
    const discountType = update.discountType ?? doc.discountType;

    validateDiscount(discount, discountType, price);

    next();
  } catch (err) {
    next(err);
  }
});

const numericFields = ["price", "discount", "priceAfterDiscount"];

ProductSchema.pre("save", function (next) {
  try {
    // Round numeric fields
    for (const field of numericFields) {
      if (this[field] != null) this[field] = round2(this[field]);
    }

    // Validate discount
    validateDiscount(this.discount, this.discountType, this.price);
    next();
  } catch (err) {
    next(err);
  }
});

// Pre-update hooks for query operations
ProductSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate"],
  async function (next) {
    try {
      const update = this.getUpdate();
      const doc = await this.model.findOne(this.getQuery());

      // Get values from update or fallback to current document
      const price = update.price ?? doc.price;
      const discount = update.discount ?? doc.discount;
      const discountType = update.discountType ?? doc.discountType;

      // Validate discount
      validateDiscount(discount, discountType, price);

      // Round numeric fields in $set or $inc
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
    } catch (err) {
      next(err);
    }
  },
);

module.exports = mongoose.model("Product", ProductSchema);

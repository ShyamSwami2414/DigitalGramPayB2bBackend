const mongoose = require("mongoose");
const { generateSKU } = require("../utils/generateProductSKU");

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
        },

        discount: {
            type: Number,
            default: 0,
            min: [0, "Discount cannot be negative"],
        },

        priceAfterDiscount: {
            type: Number,
            default: 0,
            min: [0, "Price after discount cannot be negative"],
        },

        discountType: {
            type: String,
            enum: ["percentage", "flat", 'none'],
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
    }
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

module.exports = mongoose.model("Product", ProductSchema);
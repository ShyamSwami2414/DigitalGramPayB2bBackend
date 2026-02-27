const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        products: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
                },

                quantity: {
                    type: Number,
                    required: true,
                },
            }
        ],

        totalAmount: {
            type: Number,
            required: true,
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
            country: {
                type: String,
                required: true,
            }
        },

        paymentStatus: {
            type: String,
            enum: ["pending", "completed", "failed"],
            default: "pending",

        },

        orderStatus: {
            type: String,
            enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
            default: "pending",

        },

        paymentMethod: {
            type: String,
            enum: ["cash", "online", "wallet"],
            default: "cash",
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
    }
)

module.exports = mongoose.model("Order", OrderSchema);

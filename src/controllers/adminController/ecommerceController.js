const Product = require("../../models/productModel");
const mongoose = require("mongoose");

exports.getProductById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Product ID",
            });
        }

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Product fetched successfully",
            data: product,
        });
    } catch (error) {
        next(error);
    }
}

exports.getProductList = async (req, res, next) => {
    try {
        let { page = 1, limit = 10 } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        const skip = (page - 1) * limit;

        const filter = { isDeleted: false }

        const products = await
            Product.
                find(filter).
                skip(skip).
                limit(limit).
                sort({ createdAt: -1 });

        const total = await Product.countDocuments(filter);
        res.status(200).json({
            success: true,
            message: "Products fetched successfully",
            data: products,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        next(error);
    }
}

exports.addProduct = async (req, res, next) => {
    try {
        let {
            name,
            price,
            discount,
            discountType,
            category,
            stock,
            description,
        } = req.body;

        console.log("discountType", discountType);

        name = name?.trim();
        category = category?.trim().toLowerCase();
        description = description?.trim();
        price = Number(price);
        stock = Number(stock);
        discountType = discountType?.trim().toLowerCase();

        const productImage = req.file?.filename;

        const requiredFields = ["name", "price", "category", "stock", "description"];

        const missingFields = [];
        requiredFields.forEach((field) => {
            if (!req.body[field]) {
                missingFields.push(field);
            }
        });

        if (!productImage) {
            missingFields.push("productImage");
        }

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(", ")}`,
            });
        }

        if (isNaN(price) || isNaN(stock)) {
            return res.status(400).json({
                success: false,
                message: "Price and stock must be numbers",
            });
        }

        if (discount !== undefined) {
            discount = Number(discount);
            if (isNaN(discount) || discount < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Discount must be a number and cannot be negative",
                });
            }
        }

        if (price < 0 || stock < 0) {
            return res.status(400).json({
                success: false,
                message: "Price and stock cannot be negative",
            });
        }

        let priceAfterDiscount = price;

        if (discount) {
            priceAfterDiscount = discountType === "percentage" ?
                price - (price * discount / 100) :
                price - discount;
        }

        if (discountType && !["percentage", "flat"].includes(discountType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid discount type",
            });
        }

        if (discountType === "percentage" && discount > 100) {
            return res.status(400).json({
                success: false,
                message: "Discount cannot be greater than 100",
            });
        }

        const product = await Product.create({
            name,
            price,
            discount,
            discountType,
            category,
            stock,
            description,
            priceAfterDiscount,
            productImageUrl: `/uploads/products/${productImage}`
        });

        res.status(201).json({
            success: true,
            message: "Product added successfully",
            data: product,
        });
    } catch (error) {
        next(error);
    }
}

exports.updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        let { name, price, discount, discountType, category, stock, description } = req.body;
        name = name?.trim();
        category = category?.trim().toLowerCase();
        description = description?.trim();
        price = Number(price);
        stock = Number(stock);
        discountType = discountType?.trim().toLowerCase();

        const productImage = req.file?.filename;

        const requiredFields = ["name", "price", "discountType", "category", "stock", "description"];

        const missingFields = [];
        requiredFields.forEach((field) => {
            if (!req.body[field]) {
                missingFields.push(field);
            }
        });

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(", ")}`,
            });
        }

        if (isNaN(price) || isNaN(stock)) {
            return res.status(400).json({
                success: false,
                message: "Price and stock must be numbers",
            });
        }

        if (price < 0 || stock < 0) {
            return res.status(400).json({
                success: false,
                message: "Price and stock cannot be negative",
            });
        }

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID",
            });
        }

        if (discount !== undefined) {
            discount = Number(discount);
            if (isNaN(discount) || discount < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Discount must be a number and cannot be negative",
                });
            }
        }

        let priceAfterDiscount = price;

        if (discount) {
            priceAfterDiscount = discountType === "percentage" ?
                price - (price * discount / 100) :
                price - discount;
        }

        if (discountType && !["percentage", "flat"].includes(discountType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid discount type",
            });
        }

        if (discountType === "percentage" && discount > 100) {
            return res.status(400).json({
                success: false,
                message: "Discount cannot be greater than 100",
            });
        }

        const updatesProduct = {
            name,
            price,
            discount,
            discountType,
            category,
            stock,
            description,
            priceAfterDiscount,
            productImageUrl: `/uploads/products/${productImage}`
        }

        const product = await Product.findOneAndUpdate(
            { _id: id },
            updatesProduct,
            { new: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            data: product,
        });
    } catch (error) {
        next(error);
    }
}

exports.deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID",
            });
        }

        const product = await Product.findOneAndUpdate(
            {
                _id: id,
                isDeleted: false
            },
            {
                $set: {
                    isDeleted: true,
                    deletedAt: new Date(),
                }
            },
            {
                new: true
            }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found or already deleted",
            });
        }

        res.status(200).json({
            success: true,
            message: "Product deleted successfully",
            data: product,
        });

    } catch (error) {
        next(error);
    }
}

const Order = require("../../models/orderModel");
const mongoose = require("mongoose");

exports.createOrder = async (req, res, next) => {
    try {
        const { products } = req.body;
        const userId = req.user.id;

        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Products are required",
            });
        }

        const order = await Order.create({
            userId,
            products,
        });

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: order,
        });
    } catch (error) {
        next(error);
    }
}

exports.getMyOrders = async (req, res, next) => {
    try {
        let { page = 1, limit = 10, search = '' } = req.query;
        page = Number(page);
        limit = Number(limit);
        search = search?.trim();

        const skip = (page - 1) * limit;
        const userId = req.user.id;

        const filter = {
            userId: new mongoose.Types.ObjectId(userId),
            isDeleted: false,
        };

        if (search) {
            filter.$or = [
                { productName: { $regex: search, $options: "i" } },
                { paymentStatus: { $regex: search, $options: "i" } },
                { orderStatus: { $regex: search, $options: "i" } },
                { paymentMethod: { $regex: search, $options: "i" } },
            ];
        }

        const orders = await Order.aggregate([
            {
                $match: filter
            },
            {
                $lookup: {
                    from: "products",
                    localField: "products.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            {
                $unwind: "$product"
            },
            {
                $addFields: {
                    productName: "$product.name"
                }
            },
            {
                $project: {
                    _id: 1,
                    userId: 1,
                    productName: 1,
                    totalAmount: 1,
                    paymentStatus: 1,
                    orderStatus: 1,
                    paymentMethod: 1,
                    createdAt: 1,
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ])

        const total = await Order.countDocuments(filter);

        res.status(200).json({
            success: true,
            message: orders.length > 0 ? "Orders fetched successfully" : "No orders found",
            data: orders,
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
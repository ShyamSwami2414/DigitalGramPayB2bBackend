const Order = require("../../models/orderModel");
const mongoose = require("mongoose");
const { paiseToRupee } = require("../../utils/money");

exports.getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Order ID",
      });
    }

    const filter = {
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: false,
    };

    const [order] = await Order.aggregate([
      {
        $match: filter,
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $addFields: {
          email: "$user.email",
          fullName: {
            $concat: ["$user.firstName", " ", "$user.lastName"],
          },
          userName: "$user.userName",
        },
      },

      {
        $lookup: {
          from: "products",
          localField: "product.productId",
          foreignField: "_id",
          as: "p",
        },
      },
      {
        $unwind: "$p",
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          quantity: "$product.quantity",
          grandTotal: 1,
          shippingCharge: 1,
          gst: 1,
          subTotal: 1,
          fullName: 1,
          userName: 1,
          email: 1,
          shippingAddress: 1,
          p: 1,
          totalAmount: 1,
          paymentStatus: 1,
          orderStatus: 1,
          paymentMethod: 1,
          createdAt: 1,
        },
      },
    ]);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const formattedData = order
      ? {
          ...order,
          subTotal: paiseToRupee(order?.subTotal),
          shippingCharge: paiseToRupee(order?.shippingCharge),
          gst: paiseToRupee(order?.gst),
          grandTotal: paiseToRupee(order?.grandTotal),

          p: order.p
            ? {
                ...order.p,
                price: paiseToRupee(order.p?.price),
                discount: paiseToRupee(order.p?.discount),
                priceAfterDiscount: paiseToRupee(order.p?.priceAfterDiscount),
              }
            : null,
        }
      : null;

    res.status(200).json({
      success: true,
      message: "Order fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrderList = async (req, res, next) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;
    const filter = { isDeleted: false };

    const orders = await Order.aggregate([
      {
        $match: filter,
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $addFields: {
          fullName: {
            $concat: ["$user.firstName", " ", "$user.lastName"],
          },
          userName: "$user.userName",
        },
      },

      {
        $lookup: {
          from: "products",
          localField: "product.productId",
          foreignField: "_id",
          as: "p",
        },
      },
      {
        $unwind: "$p",
      },
      {
        $addFields: {
          productName: "$p.name",
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          quantity: "$product.quantity",
          grandTotal: 1,
          fullName: 1,
          userName: 1,
          productName: 1,
          totalAmount: 1,
          paymentStatus: 1,
          orderStatus: 1,
          paymentMethod: 1,
          createdAt: 1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    const total = await Order.countDocuments(filter);

    const formattedData = orders.map((item) => ({
      ...item,
      grandTotal: paiseToRupee(item?.grandTotal),
    }));

    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: formattedData,
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
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { orderStatus } = req.body;
    orderStatus = orderStatus?.trim()?.toLowerCase();

    console.log(orderStatus, "orderStatus");

    const filter = {
      _id: new mongoose.Types.ObjectId(id),
      isDeleted: false,
      status: { $nin: ["cancelled", "delivered"] },
    };

    if (!orderStatus) {
      return res.status(400).json({
        success: false,
        message: "Order Status is required",
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Order ID",
      });
    }

    const allowedStatus = ["processing", "shipped", "delivered", "cancelled"];

    if (!allowedStatus.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Order Status",
      });
    }

    const orderExists = await Order.findOne(filter);

    if (!orderExists) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const transitionMap = {
      pending: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered", "cancelled"],
      delivered: [],
      cancelled: [],
    };

    if (!transitionMap[orderExists.orderStatus].includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Status Stage",
      });
    }

    const order = await Order.findOneAndUpdate(
      filter,
      {
        $set: {
          orderStatus: orderStatus,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const formattedData = order
      ? {
          ...order,
          subTotal: paiseToRupee(order?.subTotal),
          shippingCharge: paiseToRupee(order?.shippingCharge),
          gst: paiseToRupee(order?.gst),
          grandTotal: paiseToRupee(order?.grandTotal),
        }
      : null;

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

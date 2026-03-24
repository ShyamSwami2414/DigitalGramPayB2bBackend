const Order = require("../../models/orderModel");
const mongoose = require("mongoose");
const Product = require("../../models/productModel");
const UserWallet = require("../../models/userWallet");
const WalletLedger = require("../../models/walletLedgerModel");
const { rupeeToPaise, paiseToRupee } = require("../../utils/money");
const {
  generateUniqueRefernceId,
} = require("../../utils/generateUniqueReferenceId");

exports.createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const userId = req.user.id;
    session.startTransaction();

    let { product, shippingAddress, shippingCharge, gst } = req.body;

    shippingCharge = Number(shippingCharge);

    gst = Number(gst); //percentage

    const shippingChargeInPaise = rupeeToPaise(shippingCharge);

    if (isNaN(shippingCharge) || isNaN(gst)) {
      const err = new Error("Shipping Charge and GST must be a number");
      err.statusCode = 400;
      throw err;
    }

    if (!product || !product.productId || !product.quantity) {
      const err = new Error("Product and quantity are required");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(product.productId)) {
      const err = new Error("Invalid Product ID");
      err.statusCode = 400;
      throw err;
    }

    if (product.quantity <= 0) {
      const err = new Error("Quantity must be greater than 0");
      err.statusCode = 400;
      throw err;
    }

    if (
      !shippingAddress ||
      !shippingAddress.name ||
      !shippingAddress.address ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.pincode
    ) {
      const err = new Error("Shipping Address is required");
      err.statusCode = 400;
      throw err;
    }

    // Fetch product
    const dbProduct = await Product.findOne({
      _id: product.productId,
      isDeleted: false,
    }).session(session);

    if (!dbProduct) {
      const err = new Error("Product not found");
      err.statusCode = 404;
      throw err;
    }

    // Check stock
    if (dbProduct.stock < product.quantity) {
      const err = new Error("Insufficient stock");
      err.statusCode = 400;
      throw err;
    }

    // Calculate amounts
    const subTotal = dbProduct.priceAfterDiscount * product.quantity;
    const gstAmount = Math.round((subTotal * gst) / 100);
    const grandTotal = subTotal + gstAmount + shippingChargeInPaise;

    const referenceId = generateUniqueRefernceId();

    // Create order
    const order = await Order.create(
      [
        {
          userId,
          referenceId: referenceId,
          product,
          shippingAddress,
          shippingCharge: shippingChargeInPaise,
          gst: gstAmount, // amount
          subTotal,
          grandTotal,
        },
      ],
      { session },
    );

    // Reduce stock
    await Product.updateOne(
      { _id: product.productId },
      { $inc: { stock: -product.quantity } },
      { session },
    );

    let openingBalance = 0;
    let closingBalance = 0;

    const query = {
      userId: userId,
      isDeleted: false,
      isActive: true,
      $expr: {
        $gte: [{ $subtract: ["$mainWallet", "$mainHoldAmount"] }, grandTotal],
      },
    };

    const updatedWallet = await UserWallet.findOneAndUpdate(
      query,
      {
        $inc: {
          mainWallet: -grandTotal,
        },
      },
      {
        session,
        new: true,
      },
    );

    if (!updatedWallet) {
      const err = new Error("Insufficient Wallet Balance");
      err.statusCode = 400;
      throw err;
    }

    closingBalance = updatedWallet.mainWallet;
    openingBalance = closingBalance + grandTotal;

    await WalletLedger.create(
      [
        {
          userId,
          referenceId: referenceId,
          wallet: "main",
          type: "debit",
          amount: grandTotal,
          openingBalance,
          closingBalance,
          referenceId: order[0]._id,
          description: "New Order placed",
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order[0],
    });
  } catch (error) {
    if (session.inTransaction) {
      await session.abortTransaction();
    }

    next(error);
  } finally {
    session.endSession();
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    console.log(req.user.id, "userId");
    let { page = 1, limit = 10, search = "" } = req.query;
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
        $match: filter,
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
          unitPrice: "$p.priceAfterDiscount",
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          quantity: "$product.quantity",
          productName: 1,
          unitPrice: 1,
          gst: 1,
          shippingCharge: 1,
          subTotal: 1,
          grandTotal: 1,
          paymentStatus: 1,
          orderStatus: 1,
          paymentMethod: 1,
          createdAt: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    const formattedData = orders.map((item) => ({
      ...item,
      subTotal: paiseToRupee(item.subTotal),
      shippingCharge: paiseToRupee(item.shippingCharge),
      gst: paiseToRupee(item.gst),
      grandTotal: paiseToRupee(item.grandTotal),
      unitPrice: paiseToRupee(item.unitPrice),
    }));

    console.log("orders", orders);

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      message:
        formattedData?.length > 0
          ? "Orders fetched successfully"
          : "No orders found",
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

exports.getMyOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

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
      userId: new mongoose.Types.ObjectId(userId),
    };

    const [order] = await Order.aggregate([
      {
        $match: filter,
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
          unitPrice: "$p.priceAfterDiscount",
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          quantity: "$product.quantity",
          productName: 1,
          unitPrice: 1,
          gst: 1,
          shippingCharge: 1,
          subTotal: 1,
          grandTotal: 1,
          paymentStatus: 1,
          orderStatus: 1,
          paymentMethod: 1,
          createdAt: 1,
          shippingAddress: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    if (!order) {
      return res.status(200).json({
        success: true,
        message: "Order not found",
        data: order,
      });
    }

    const formattedData = order
      ? {
          ...order,
          subTotal: paiseToRupee(order.subTotal),
          shippingCharge: paiseToRupee(order.shippingCharge),
          gst: paiseToRupee(order.gst),
          grandTotal: paiseToRupee(order.grandTotal),
          unitPrice: paiseToRupee(order.unitPrice),
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

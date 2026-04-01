const Product = require("../../models/productModel");
const mongoose = require("mongoose");
const { paiseToRupee } = require("../../utils/money");

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

    const product = await Product.findById(id).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const formattedData = product
      ? {
          ...product,
          price: paiseToRupee(product.price),
          discount: paiseToRupee(product.discount),
          priceAfterDiscount: paiseToRupee(product.priceAfterDiscount),
        }
      : null;

    res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getProductList = async (req, res, next) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const filter = { isDeleted: false };

    const products = await Product.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Product.countDocuments(filter);

    const formattedData = products.map((item) => ({
      ...item,
      price: paiseToRupee(item.price),
      discount: paiseToRupee(item.discount),
      priceAfterDiscount: paiseToRupee(item.priceAfterDiscount),
    }));

    res.status(200).json({
      success: true,
      message: "Products fetched successfully",
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

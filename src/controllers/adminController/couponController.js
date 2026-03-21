const mongoose = require("mongoose");
const Coupon = require("../../models/couponModel");
const { rupeeToPaise, paiseToRupee } = require("../../utils/money");

exports.getCouponList = async (req, res, next) => {
  try {
    let { page = 1, limit = 10 } = req.query;

    page = Number(page);
    limit = Number(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    const filter = { isDeleted: false };

    const skip = (page - 1) * limit;

    // Fetch coupons
    const coupons = await Coupon.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Coupon.countDocuments(filter);

    const formattedData = coupons.map((item) => ({
      ...item,
      amount: paiseToRupee(item?.amount),
    }));

    return res.status(200).json({
      success: true,
      message: "Coupons fetched successfully",
      data: formattedData,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createCoupon = async (req, res, next) => {
  try {
    let { code, amount } = req.body;

    code = code?.trim().toUpperCase();
    amount = Number(amount);

    const amountInPaise = rupeeToPaise(amount);

    if (isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a valid number",
      });
    }

    if (!code || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "Code and amount are required",
      });
    }

    if (typeof amount !== "number" || amount < 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number",
      });
    }

    const existingCoupon = await Coupon.findOne({ code: code });
    if (existingCoupon) {
      return res.status(409).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    const newCoupon = await Coupon.create({
      code: code,
      amount: amountInPaise,
    });

    const formattedData = newCoupon
      ? { ...newCoupon._doc, amount: paiseToRupee(newCoupon?.amount) }
      : null;

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid couponId is required",
      });
    }

    const coupon = await Coupon.findOne({ _id: id, isDeleted: false });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found or deleted",
      });
    }

    // Toggle isActive
    coupon.isActive = !coupon.isActive;
    await coupon.save();

    return res.status(200).json({
      success: true,
      message: `Coupon is now ${coupon.isActive ? "active" : "inactive"}`,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid couponId is required",
      });
    }

    const updatedCoupon = await Coupon.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    );

    if (!updatedCoupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found or already deleted",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
      data: updatedCoupon,
    });
  } catch (error) {
    next(error);
  }
};

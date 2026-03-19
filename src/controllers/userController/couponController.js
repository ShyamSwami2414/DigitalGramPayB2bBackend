const Coupon = require("../../models/couponModel");
const User = require("../../models/userModel");
const Role = require("../../models/roleModel");

const mongoose = require("mongoose");

const redeemCoupon = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const userId = req.user.id;
    const roleId = req.user.role;
    const { couponCode } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    if (!roleId) {
      return res.status(404).json({
        success: false,
        message: "Role Id is required",
      });
    }

    const role = await Role.findById(roleId).lean();

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    const coupon = await Coupon.findOneAndUpdate(
      {
        code: couponCode,
        isUsed: false,
        isActive: true,
        isExpired: false,
        isDeleted: false,
      },
      {
        $set: {
          isUsed: true,
          isExpired: true,
          isActive: false,
          usedDate: new Date(),
          usedBy: new mongoose.Types.ObjectId(userId),
        },
      },
      { new: true, session },
    );

    if (!coupon) {
      return res.status(400).json({
        success: false,
        message: "Invalid or already used coupon",
      });
    }

    if (coupon.amount !== role.onBoardCharge) {
      await Coupon.updateOne(
        { _id: coupon._id },
        { $set: { isUsed: false, usedDate: null } },
        { session },
      );

      return res.status(400).json({
        success: false,
        message: "Coupon not applicable, contact admin",
      });
    }

    const user = await User.findOneAndUpdate(
      {
        _id: userId,
        isActive: true,
        isDeleted: false,
      },
      {
        $set: {
          isPaymentDone: true,
        },
      },
      {
        new: true,
        session,
      },
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Coupon redeemed successfully",
      data: {
        couponAppliedAmount: coupon.amount,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

module.exports = { redeemCoupon };

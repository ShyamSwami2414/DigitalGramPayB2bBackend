const mongoose = require("mongoose");
const Role = require("../../models/roleModel");

exports.getOnBoardCharges = async (req, res, next) => {
  try {
    const charges = await Role.find({
      isActive: true,
      isDeleted: false,
    }).select("name onBoardCharge isPaymentRequired");

    return res.status(200).json({
      success: true,
      message: "Charges fetched successfully",
      data: charges,
    });
  } catch (error) {
    next(error);
  }
};

exports.setOnBoardCharges = async (req, res, next) => {
  try {
    console.log(req.body, "body");
    const { role, amount, isPaymentRequired } = req.body;

    if (!role || !amount || isPaymentRequired === null) {
      return res
        .status(400)
        .json({ success: false, message: "All Details is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(role)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Role ID" });
    }

    const newRole = await Role.findOneAndUpdate(
      { _id: role, isDeleted: false },
      {
        $set: {
          onBoardCharge: amount,
          isPaymentRequired: isPaymentRequired,
        },
      },
      { new: true },
    );

    if (!newRole) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Charges Set Successfully",
      data: newRole,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCharge = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, isPaymentRequired } = req.body;

    if (!id || !amount || isPaymentRequired === null) {
      return res
        .status(400)
        .json({ success: false, message: "Details Missing" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const charge = await Role.findOneAndUpdate(
      {
        _id: id,
        isActive: true,
        isDeleted: false,
      },
      {
        $set: {
          onBoardCharge: amount,
          isPaymentRequired: isPaymentRequired,
        },
      },
      {
        new: true,
      },
    );

    if (!charge) {
      return res
        .status(404)
        .json({ success: false, message: "Charge Data Not Found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Charges Updated", data: charge });
  } catch (error) {
    next(error);
  }
};

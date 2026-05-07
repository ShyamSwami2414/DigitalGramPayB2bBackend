const WalletTopupBank = require("../../models/walletTopupBankModel");
const mongoose = require("mongoose");

exports.getAllWalletTopupBanks = async (req, res, next) => {
  try {
    console.log(req.user, "user");
    const walletTopupBanks = await WalletTopupBank.find({
      adminId: req.user.id,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Wallet topup banks fetched successfully",
      data: walletTopupBanks,
    });
  } catch (error) {
    next(error);
  }
};

exports.addWalletTopupBank = async (req, res, next) => {
  try {
    const {
      bankName,
      accountNumber,
      ifscCode,
      accountHolderName,
      upiId = "",
    } = req.body;
    console.log(req.file, "Qr file");
    const qrCode = req?.file?.filename;
    const requiredFields = [
      "bankName",
      "accountNumber",
      "ifscCode",
      "accountHolderName",
    ];

    const missingFields = [];

    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (!qrCode) {
      missingFields.push("qrCode");
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const existingBank = await WalletTopupBank.findOne({
      accountNumber: accountNumber,
      isDeleted: false,
    });

    if (existingBank) {
      return res.status(400).json({
        success: false,
        message: "Bank already exists",
      });
    }

    const walletTopupBank = new WalletTopupBank({
      adminId: req.user.id,
      qrCode: `/uploads/qrCodeImages/${qrCode}`,
      bankName,
      accountNumber,
      ifscCode,
      accountHolderName,
      upiId,
    });

    await walletTopupBank.save();

    return res.status(201).json({
      success: true,
      message: "Wallet topup bank added successfully",
      data: walletTopupBank,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateWalletTopupBankStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Bank id is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bank id",
      });
    }

    const existingBank = await WalletTopupBank.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!existingBank) {
      return res.status(404).json({
        success: false,
        message: "Bank not found",
      });
    }

    const walletTopupBank = await WalletTopupBank.findByIdAndUpdate(
      id,
      {
        $set: {
          isActive: !existingBank.isActive,
        },
      },
      {
        new: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Wallet topup bank updated successfully",
      data: walletTopupBank,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteWalletTopupBank = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Wallet topup bank id is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet topup bank id",
      });
    }

    const walletTopupBank = await WalletTopupBank.findByIdAndUpdate(
      id,
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
      {
        new: true,
      },
    );

    if (!walletTopupBank) {
      return res.status(404).json({
        success: false,
        message: "Wallet topup bank not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Wallet topup bank deleted successfully",
      data: walletTopupBank,
    });
  } catch (error) {
    next(error);
  }
};

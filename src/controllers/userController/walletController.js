const mongoose = require("mongoose");
const UserWallet = require("../../models/userWallet");
const User = require("../../models/userModel");
const WalletLedger = require("../../models/walletLedgerModel");
const { rupeeToPaise, paiseToRupee } = require("../../utils/money");
const {
  generateUniqueRefernceId,
} = require("../../utils/generateUniqueReferenceId");

exports.aepsToMainTransfer = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    let { amount } = req.body;
    amount = Number(amount);

    const amountInPaise = rupeeToPaise(amount);

    const userId = req.user.id;
    const operation = "AEPS_TO_MAIN_TRANSFER";

    if (!amount || isNaN(amount) || amount <= 0) {
      const error = new Error("Amount must be a valid number greater than 0");
      error.statusCode = 400;
      throw error;
    }

    session.startTransaction({
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });

    const referenceId = generateUniqueRefernceId();

    const userExist = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      isActive: true,
      isDeleted: false,
    }).session(session);

    if (!userExist) {
      const error = new Error("User not found or not active");
      error.statusCode = 400;
      throw error;
    }

    const updatedUserWallet = await UserWallet.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
        isDeleted: false,
        $expr: {
          $gte: [
            { $subtract: ["$aepsWallet", "$aepsHoldAmount"] },
            amountInPaise,
          ],
        },
      },
      {
        $inc: {
          aepsWallet: -amountInPaise,
          mainWallet: amountInPaise,
        },
      },
      {
        new: true,
        session: session,
      },
    );

    if (!updatedUserWallet) {
      const error = new Error(
        "Your transfer amount exceeds your current limit",
      );
      error.statusCode = 400;
      throw error;
    }

    const aepsClosingBalance = updatedUserWallet.aepsWallet;
    const mainClosingBalance = updatedUserWallet.mainWallet;
    const aepsOpeningBalance = aepsClosingBalance + amountInPaise;
    const mainOpeningBalance = mainClosingBalance - amountInPaise;

    if (!updatedUserWallet) {
      const error = new Error("User wallet not found");
      error.statusCode = 400;
      throw error;
    }

    await WalletLedger.insertMany(
      [
        {
          userId: new mongoose.Types.ObjectId(userId),
          wallet: "aeps",
          type: "debit",
          amount: amountInPaise,
          openingBalance: aepsOpeningBalance,
          closingBalance: aepsClosingBalance,
          description: "AEPS to Main Wallet Transfer",
          referenceId: referenceId,
        },
        {
          userId: new mongoose.Types.ObjectId(userId),
          wallet: "main",
          type: "credit",
          amount: amountInPaise,
          openingBalance: mainOpeningBalance,
          closingBalance: mainClosingBalance,
          description: "AEPS to Main Wallet Transfer",
          referenceId: referenceId,
        },
      ],
      { session: session },
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "AEPS to main wallet transfer successful",
      data: updatedUserWallet,
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

exports.getWalletBalance = async (req, res, next) => {
  try {
    // const { userId } = req.params;
    const userId = req.query?.userId ?? req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const userExist = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      isActive: true,
      isDeleted: false,
    });

    if (!userExist) {
      return res.status(400).json({
        success: false,
        message: "User not found or not active",
      });
    }

    const [userWallet] = await UserWallet.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isActive: true,
          isDeleted: false,
        },
      },
      {
        $project: {
          userId: 1,
          aepsWallet: 1,
          mainWallet: 1,
          aepsHoldAmount: 1,
          mainHoldAmount: 1,
        },
      },
    ]);

    const formattedData = userWallet
      ? {
          ...userWallet,
          aepsWallet: paiseToRupee(userWallet.aepsWallet),
          mainWallet: paiseToRupee(userWallet.mainWallet),
          aepsHoldAmount: paiseToRupee(userWallet.aepsHoldAmount),
          mainHoldAmount: paiseToRupee(userWallet.mainHoldAmount),
        }
      : null;

    return res.status(200).json({
      success: true,
      message: "User wallet fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

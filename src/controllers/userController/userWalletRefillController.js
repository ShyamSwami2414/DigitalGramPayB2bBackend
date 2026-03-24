const mongoose = require("mongoose");
const User = require("../../models/userModel");
const UserWallet = require("../../models/userWallet");
const WalletLedger = require("../../models/walletLedgerModel");
const { rupeeToPaise, paiseToRupee } = require("../../utils/money");
const {
  generateUniqueRefernceId,
} = require("../../utils/generateUniqueReferenceId");

exports.userProfileForRefill = async (req, res, next) => {
  try {
    let { userId } = req.query;
    userId = userId?.trim();

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid User ID",
      });
    }

    const [result] = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(userId),
          isActive: true,
          isDeleted: false,
          parentUserId: new mongoose.Types.ObjectId(req.user.id),
        },
      },
      {
        $lookup: {
          from: "userwallets",
          localField: "_id",
          foreignField: "userId",
          as: "wallet",
        },
      },
      {
        $unwind: "$wallet",
      },
      {
        $project: {
          _id: 0,

          userId: "$_id",
          name: { $concat: ["$firstName", " ", "$lastName"] },
          userName: 1,
          phone: 1,
          email: 1,
          isActive: 1,

          mainWallet: "$wallet.mainWallet",
          aepsWallet: "$wallet.aepsWallet",
        },
      },
    ]);

    const formattedData = result
      ? {
          ...result,
          mainWallet: paiseToRupee(result.mainWallet),
          aepsWallet: paiseToRupee(result.aepsWallet),
        }
      : null;

    return res.status(200).json({
      success: true,
      message: "User profile fetched Successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.refillUserWallet = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    let { userId, amount } = req.body;
    userId = userId?.trim();
    amount = Number(amount);

    const amountInPaise = rupeeToPaise(amount);

    if (!userId) {
      const err = new Error("User ID is required");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      const err = new Error("Invalid User ID");
      err.statusCode = 400;
      throw err;
    }

    const userExist = await User.findOne({
      _id: userId,
      parentUserId: new mongoose.Types.ObjectId(req.user.id),
      isActive: true,
      isDeleted: false,
    });

    if (!userExist) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    const referenceId = generateUniqueRefernceId();
    let uplineOpeningBalance = 0;
    let uplineClosingBalance = 0;
    let downlineOpeningBalance = 0;
    let downlineClosingBalance = 0;

    //debit from user who is refilling to downline
    const uplineWallet = await UserWallet.findOneAndUpdate(
      {
        userId: req.user.id,
        $expr: {
          $gte: [
            { $subtract: ["$mainWallet", "$mainHoldAmount"] },
            amountInPaise,
          ],
        },
      },
      {
        $inc: {
          mainWallet: -amountInPaise,
        },
      },
      { new: true, session },
    );

    if (!uplineWallet) {
      const err = new Error("Insufficient Balance , Contact Admin");
      err.statusCode = 404;
      throw err;
    }

    uplineClosingBalance = uplineWallet?.mainWallet;
    uplineOpeningBalance = uplineClosingBalance + amountInPaise;

    //ledger
    await WalletLedger.create(
      [
        {
          userId: req.user.id,
          serviceType: "WALLET_REFILL",
          wallet: "main",
          type: "debit",
          amount: amountInPaise,
          openingBalance: uplineOpeningBalance,
          closingBalance: uplineClosingBalance,
          referenceId: referenceId,
          description: "WALLET_REFILL",
        },
      ],
      { session },
    );

    //credit to downline user
    const downlineWallet = await UserWallet.findOneAndUpdate(
      {
        userId: userId,
      },
      {
        $inc: {
          mainWallet: amountInPaise,
        },
      },
      { new: true, session },
    );

    if (!downlineWallet) {
      const err = new Error("User wallet not found");
      err.statusCode = 404;
      throw err;
    }

    downlineClosingBalance = downlineWallet?.mainWallet;
    downlineOpeningBalance = downlineClosingBalance - amountInPaise;

    //ledger
    await WalletLedger.create(
      [
        {
          userId: userId,
          serviceType: "WALLET_REFILL",
          wallet: "main",
          type: "credit",
          amount: amountInPaise,
          openingBalance: downlineOpeningBalance,
          closingBalance: downlineClosingBalance,
          referenceId: referenceId,
          description: "WALLET_REFILL",
        },
      ],
      { session },
    );

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "User Wallet refilled Successfully",
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

exports.getDownlineWalletRefillHistory = async (req, res, next) => {
  try {
    let { userId = "", status = "" } = req.query;
    userId = userId?.trim();
    status = status?.trim().toLowerCase();

    const filter = { serviceType: "WALLET_REFILL" };
    const allowedStatus = ["success", "pending", "failed"];

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid User ID",
        });
      }

      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    if (status) {
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Status",
        });
      }

      filter.status = status;
    }

    const [result] = await WalletLedger.aggregate([
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
        $project: {
          _id: 0,
          userId: "$userId",
          name: { $concat: ["$user.firstName", " ", "$user.lastName"] },
          userName: "$user.userName",
          phone: "$user.phone",
          email: "$user.email",
          serviceType: 1,
          referenceId: 1,
          amount: 1,
          openingBalance: "$openingBalance",
          closingBalance: "$closingBalance",
          createdAt: 1,
        },
      },
    ]);

    const formattedData = result
      ? {
          ...result,
          amount: paiseToRupee(result.amount),
          openingBalance: paiseToRupee(result.openingBalance),
          closingBalance: paiseToRupee(result.closingBalance),
        }
      : null;

    return res.status(200).json({
      success: true,
      message: "User profile fetched Successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

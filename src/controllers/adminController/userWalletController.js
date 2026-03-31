const mongoose = require("mongoose");
const UserWallet = require("../../models/userWallet");
const User = require("../../models/userModel");
const WalletLedger = require("../../models/walletLedgerModel");
const { rupeeToPaise, paiseToRupee } = require("../../utils/money");
const {
  generateUniqueRefernceId,
} = require("../../utils/generateUniqueReferenceId");

exports.getWalletBalances = async (req, res, next) => {
  try {
    const [walletBalances] = await UserWallet.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          mainWallet: { $sum: "$mainWallet" },
          aepsWallet: { $sum: "$aepsWallet" },
          mainHoldAmount: { $sum: "$mainHoldAmount" },
          aepsHoldAmount: { $sum: "$aepsHoldAmount" },
        },
      },
    ]);

    console.log(walletBalances);

    const formattedData = walletBalances
      ? {
          ...walletBalances,
          aepsWallet: paiseToRupee(walletBalances?.aepsWallet),
          mainWallet: paiseToRupee(walletBalances?.mainWallet),
          aepsHoldAmount: paiseToRupee(walletBalances?.aepsHoldAmount),
          mainHoldAmount: paiseToRupee(walletBalances?.mainHoldAmount),
        }
      : null;

    return res.status(200).json({
      success: true,
      message: "Wallet balances fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllUserWallet = async (req, res, next) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;
    const filter = { isDeleted: false };

    const userWallets = await UserWallet.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          userName: { $concat: ["$user.firstName", " ", "$user.lastName"] },
          phone: "$user.phone",
        },
      },
      {
        $project: {
          userName: 1,
          phone: 1,
          aepsWallet: 1,
          mainWallet: 1,
          aepsHoldAmount: 1,
          mainHoldAmount: { $round: ["$mainHoldAmount", 2] },
        },
      },
      { $skip: skip },
      { $limit: limit },
    ]);

    const total = await UserWallet.countDocuments(filter);

    const formattedData = userWallets.map((item) => ({
      ...item,
      aepsWallet: paiseToRupee(item?.aepsWallet),
      mainWallet: paiseToRupee(item?.mainWallet),
      aepsHoldAmount: paiseToRupee(item?.aepsHoldAmount),
      mainHoldAmount: paiseToRupee(item?.mainHoldAmount),
    }));

    return res.status(200).json({
      success: true,
      data: formattedData,
      pagination: {
        page,
        limit,
        total: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.holdReleaseAmount = async (req, res, next) => {
  try {
    let { userId, amount, walletType, type, reason } = req.body;
    amount = Number(amount);

    const amountInPaise = rupeeToPaise(amount);

    type = type?.trim().toLowerCase();
    walletType = walletType?.trim().toLowerCase();
    reason = reason?.trim();

    const requiredFields = ["userId", "amount", "type", "walletType"];
    const missingField = [];

    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        missingField.push(field);
      }
    });

    if (missingField.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing fields: ${missingField.join(", ")}`,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    if (!Number.isFinite(amount)) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    if (!["hold", "release"].includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }

    if (!["aeps", "main"].includes(walletType)) {
      return res.status(400).json({ message: "Invalid wallet type" });
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

    const field = walletType === "aeps" ? "aepsHoldAmount" : "mainHoldAmount";
    const transactionAmount = type === "hold" ? amountInPaise : -amountInPaise;

    const query =
      type === "release"
        ? {
            userId: new mongoose.Types.ObjectId(userId),
            [field]: { $gte: amountInPaise },
            isActive: true,
            isDeleted: false,
          }
        : {
            userId: new mongoose.Types.ObjectId(userId),
            isActive: true,
            isDeleted: false,
          };

    let updateData = { $inc: { [field]: transactionAmount } };

    // save reason only when HOLD
    if (type === "hold" && reason) {
      const reasonField =
        walletType === "aeps" ? "aepsHoldReason" : "mainHoldReason";

      updateData.$set = { [reasonField]: reason };
    }

    const updatedUserWallet = await UserWallet.findOneAndUpdate(
      query,
      updateData,
      { new: true },
    );

    if (!updatedUserWallet) {
      return res.status(400).json({
        success: false,
        message:
          type === "release" ? "Insufficient hold balance" : "Wallet not found",
      });
    }

    const formattedData = updatedUserWallet
      ? {
          ...updatedUserWallet,
          aepsWallet: paiseToRupee(updatedUserWallet?.aepsWallet),
          mainWallet: paiseToRupee(updatedUserWallet?.mainWallet),
          aepsHoldAmount: paiseToRupee(updatedUserWallet?.aepsHoldAmount),
          mainHoldAmount: paiseToRupee(updatedUserWallet?.mainHoldAmount),
        }
      : null;

    return res.status(200).json({
      success: true,
      message: `Amount ${type}ed successfully`,
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.creditDebitAmount = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    let { userId, amount, walletType, type, reason } = req.body;
    amount = Number(amount);

    const amountInPaise = rupeeToPaise(amount);
    const referenceId = generateUniqueRefernceId();

    type = type?.trim().toLowerCase();
    walletType = walletType?.trim().toLowerCase();
    reason = reason?.trim();

    const requiredFields = ["userId", "amount", "type", "walletType"];
    const missingField = [];
    let openingBalance = 0;
    let closingBalance = 0;

    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        missingField.push(field);
      }
    });

    if (missingField.length > 0) {
      const error = new Error(`Missing fields: ${missingField.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      const error = new Error("Invalid user ID");
      error.statusCode = 400;
      throw error;
    }

    if (!Number.isFinite(amount)) {
      const error = new Error("Invalid amount");
      error.statusCode = 400;
      throw error;
    }

    if (amount <= 0) {
      const error = new Error("Amount must be greater than 0");
      error.statusCode = 400;
      throw error;
    }

    if (!["credit", "debit"].includes(type)) {
      const error = new Error("Invalid type");
      error.statusCode = 400;
      throw error;
    }

    if (!["aeps", "main"].includes(walletType)) {
      const error = new Error("Invalid wallet type");
      error.statusCode = 400;
      throw error;
    }

    if (walletType === "aeps" && type === "credit") {
      const error = new Error("Can not credit amount to aeps wallet");
      error.statusCode = 400;
      throw error;
    }

    const userExist = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      isActive: true,
      isDeleted: false,
    });

    if (!userExist) {
      const error = new Error("User not found or not active");
      error.statusCode = 400;
      throw error;
    }

    const field = walletType === "aeps" ? "aepsWallet" : "mainWallet";
    const transactionAmount =
      type === "credit" ? amountInPaise : -amountInPaise;

    let query;

    if (type === "credit") {
      query = {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
        isDeleted: false,
      };
    } else {
      // debit prevent negative balance
      query = {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true,
        isDeleted: false,
        [field]: { $gte: amountInPaise },
      };
    }

    let updateData = { $inc: { [field]: transactionAmount } };

    let updatedUserWallet = await UserWallet.findOneAndUpdate(
      query,
      updateData,
      { new: true, session },
    );

    if (!updatedUserWallet) {
      const error = new Error(
        type === "debit" ? "Insufficient wallet balance" : "Wallet not found",
      );
      error.statusCode = 400;
      throw error;
    }

    console.log("updatedUserWallet", updatedUserWallet);

    closingBalance = updatedUserWallet[field];
    openingBalance = closingBalance - transactionAmount;

    await WalletLedger.create(
      [
        {
          userId: new mongoose.Types.ObjectId(userId),
          referenceId: referenceId,
          wallet: walletType,
          type: type,
          amount: amountInPaise,
          openingBalance: openingBalance,
          closingBalance: closingBalance,
          description: reason,
        },
      ],
      { session },
    );

    updatedUserWallet = updatedUserWallet ? updatedUserWallet.toObject() : null;

    await session.commitTransaction();

    const formattedData = updatedUserWallet
      ? {
          ...updatedUserWallet,
          aepsWallet: paiseToRupee(updatedUserWallet?.aepsWallet),
          mainWallet: paiseToRupee(updatedUserWallet?.mainWallet),
          aepsHoldAmount: paiseToRupee(updatedUserWallet?.aepsHoldAmount),
          mainHoldAmount: paiseToRupee(updatedUserWallet?.mainHoldAmount),
        }
      : null;

    return res.status(200).json({
      success: true,
      message: `Amount ${type}ed successfully`,
      data: formattedData,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    next(error);
  } finally {
    session.endSession();
  }
};

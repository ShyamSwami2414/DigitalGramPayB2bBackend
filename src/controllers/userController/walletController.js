const mongoose = require("mongoose");
const UserWallet = require("../../models/userWallet");
const User = require("../../models/userModel");
const WalletLedger = require("../../models/walletLedgerModel");
const {
  generateIdempotencyFingerprint,
} = require("../../utils/generateIdempotencyFingerprint");
const Idempotency = require("../../models/idempotencyModel");

exports.aepsToMainTransfer = async (req, res, next) => {
  const session = await mongoose.startSession();
  let fingerprint;

  try {
    let { amount } = req.body;
    amount = Number(amount);
    const userId = req.user.id;
    const operation = "AEPS_TO_MAIN_TRANSFER";

    if (!amount || isNaN(amount) || amount <= 0) {
      const error = new Error("Amount must be a valid number greater than 0");
      error.statusCode = 400;
      throw error;
    }

    fingerprint = generateIdempotencyFingerprint({
      userId,
      operation,
      amount,
    });

    session.startTransaction({
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });

    try {
      await Idempotency.create(
        [
          {
            fingerprint: fingerprint,
            userId: userId,
            operation: operation,
            status: "processing",
          },
        ],
        { session: session },
      );
    } catch (error) {
      if (error.code === 11000) {
        const existingRequest = await Idempotency.findOne({
          fingerprint: fingerprint,
        });

        if (!existingRequest) {
          const error = new Error("Idempotency state not found");
          error.statusCode = 400;
          throw error;
        }

        if (existingRequest.status === "completed") {
          if (session.inTransaction()) {
            await session.abortTransaction();
          }
          session.endSession();
          return res.status(409).json({
            success: false,
            message: "Request already completed",
          });
        }

        if (existingRequest.status === "processing") {
          if (session.inTransaction()) {
            await session.abortTransaction();
          }
          session.endSession();
          return res.status(409).json({
            success: false,
            message: "Request already processing",
          });
        }
      }
    }

    const referenceId = new mongoose.Types.ObjectId();

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
          $gte: [{ $subtract: ["$aepsWallet", "$aepsHoldAmount"] }, amount],
        },
      },
      {
        $inc: {
          aepsWallet: -amount,
          mainWallet: amount,
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
    const aepsOpeningBalance = aepsClosingBalance + amount;
    const mainOpeningBalance = mainClosingBalance - amount;

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
          amount: amount,
          openingBalance: aepsOpeningBalance,
          closingBalance: aepsClosingBalance,
          description: "AEPS to Main Wallet Transfer",
          referenceId: referenceId,
        },
        {
          userId: new mongoose.Types.ObjectId(userId),
          wallet: "main",
          type: "credit",
          amount: amount,
          openingBalance: mainOpeningBalance,
          closingBalance: mainClosingBalance,
          description: "AEPS to Main Wallet Transfer",
          referenceId: referenceId,
        },
      ],
      { session: session },
    );

    await Idempotency.findOneAndUpdate(
      {
        fingerprint: fingerprint,
      },
      {
        $set: {
          status: "completed",
          response: updatedUserWallet,
        },
      },
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
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    //mark failed idempotency
    await Idempotency.findOneAndUpdate(
      {
        fingerprint: fingerprint,
      },
      {
        status: "failed",
        response: error,
      },
    );
    next(error);
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

    return res.status(200).json({
      success: true,
      message: "User wallet fetched successfully",
      data: userWallet,
    });
  } catch (error) {
    next(error);
  }
};

// this api only for wallet aeps to main wallet transfer history
exports.getWalletTransferHistory = async (req, res, next) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    search = search.trim();
    const skip = (page - 1) * limit;
    const userId = req.user.id;

    const filter = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (search) {
      filter.$or = [
        {
          openingBalance: {
            $regex: search,
            $options: "i",
          },
        },

        {
          closingBalance: {
            $regex: search,
            $options: "i",
          },
        },
        {
          referenceId: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const walletTransferHistory = await WalletLedger.aggregate([
      {
        $match: filter,
      },
      {
        $project: {
          userId: 1,
          wallet: 1,
          type: 1,
          amount: 1,
          openingBalance: 1,
          closingBalance: 1,
          description: 1,
          referenceId: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Wallet transfer history fetched successfully",
      data: walletTransferHistory,
    });
  } catch (error) {
    next(error);
  }
};

exports.getWalletReport = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      fromDate = "",
      toDate = "",
      wallet = "",
      type = "",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    wallet = wallet.trim().toLowerCase();
    type = type.trim().toLowerCase();
    search = search.trim();
    fromDate = fromDate.trim();
    toDate = toDate.trim();
    const skip = (page - 1) * limit;
    const userId = req.user.id;

    const filter = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (wallet && !["main", "aeps"].includes(wallet)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet type",
      });
    }

    if (type && !["credit", "debit"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    if (wallet) {
      filter.wallet = wallet;
    }

    if (type) {
      filter.type = type;
    }

    if (search) {
      filter.$or = [
        {
          openingBalance: {
            $regex: search,
            $options: "i",
          },
        },

        {
          closingBalance: {
            $regex: search,
            $options: "i",
          },
        },
        {
          referenceId: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const walletReport = await User.aggregate([
      // 1. Start from logged-in user
      {
        $match: {
          _id: new mongoose.Types.ObjectId(userId),
        },
      },

      // 2. Get full downline tree
      {
        $graphLookup: {
          from: "users",
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "parentUserId",
          as: "downline",
          maxDepth: 10, // or 3 if only 4 levels
          depthField: "depth",
        },
      },

      // 3. Merge self + downline
      {
        $project: {
          allUsers: {
            $concatArrays: [["$$ROOT"], "$downline"],
          },
        },
      },

      // 4. Flatten users
      { $unwind: "$allUsers" },

      // 5. Lookup wallet transactions
      {
        $lookup: {
          from: "walletledgers",
          localField: "allUsers._id",
          foreignField: "userId",
          as: "transactions",
        },
      },

      // 6. Flatten transactions
      { $unwind: "$transactions" },

      // 7. Apply your filters HERE (IMPORTANT)
      {
        $match: {
          ...(wallet && { "transactions.wallet": wallet }),
          ...(type && { "transactions.type": type }),

          ...(search && {
            $or: [
              {
                "transactions.referenceId": {
                  $regex: search,
                  $options: "i",
                },
              },
            ],
          }),

          ...(fromDate &&
            toDate && {
              "transactions.createdAt": {
                $gte: new Date(fromDate),
                $lte: new Date(toDate),
              },
            }),
        },
      },

      // 8. Format output
      {
        $project: {
          _id: "$transactions._id",
          amount: "$transactions.amount",
          type: "$transactions.type",
          wallet: "$transactions.wallet",
          openingBalance: "$transactions.openingBalance",
          closingBalance: "$transactions.closingBalance",
          description: "$transactions.description",
          referenceId: "$transactions.referenceId",
          createdAt: "$transactions.createdAt",

          // 👇 VERY IMPORTANT (user info)
          user: {
            _id: "$allUsers._id",
            firstName: "$allUsers.firstName",
            lastName: "$allUsers.lastName",
            userName: "$allUsers.userName",
            level: "$allUsers.level",
          },
        },
      },

      // 9. Sort
      { $sort: { createdAt: -1 } },

      // 10. Pagination
      { $skip: skip },
      { $limit: limit },
    ]);

    // const walletReport = await WalletLedger.aggregate([
    //   {
    //     $match: filter,
    //   },
    //   {
    //     $project: {
    //       userId: 1,
    //       wallet: 1,
    //       type: 1,
    //       amount: 1,
    //       openingBalance: 1,
    //       closingBalance: 1,
    //       description: 1,
    //       referenceId: 1,
    //       createdAt: 1,
    //       updatedAt: 1,
    //     },
    //   },
    //   {
    //     $sort: {
    //       createdAt: -1,
    //     },
    //   },
    //   {
    //     $skip: skip,
    //   },
    //   {
    //     $limit: limit,
    //   },
    // ]);

    return res.status(200).json({
      success: true,
      message: "Wallet report fetched successfully",
      data: walletReport,
    });
  } catch (error) {
    next(error);
  }
};

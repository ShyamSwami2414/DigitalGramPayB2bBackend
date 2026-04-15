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

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

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
    let {
      page = 1,
      limit = 10,
      search = "",
      userId = "",
      status = "",
      from = "",
      to = "",
      range = "",
    } = req.query;

    console.log(req.query, "query");
    console.log(req.user.id, "request user");

    page = Number(page);
    limit = Number(limit);
    search = search?.trim();
    status = status?.trim().toLowerCase();
    userId = userId?.trim();
    range = typeof range === "string" ? range?.trim().toLowerCase() : "";
    from = typeof from === "string" ? from.trim().toLowerCase() : "";
    to = typeof to === "string" ? to.trim().toLowerCase() : "";

    // normalize invalid inputs
    if (!from || from === "null" || from === "undefined") {
      from = undefined;
    }

    if (!to || to === "null" || to === "undefined") {
      to = undefined;
    }

    if (!range || range === "null" || range === "undefined") {
      range = undefined;
    }

    const filter = {
      serviceType: "WALLET_REFILL",
      type: "credit",
      userId: { $ne: new mongoose.Types.ObjectId(req.user.id) },
    };

    const skip = (page - 1) * limit;
    const now = new Date();
    let fromDate, toDate;

    const allowedStatus = ["success", "pending", "failed"];
    const allowedRanges = ["today", "yesterday", "last7days", "thismonth"];

    if (status && !allowedStatus.includes(status)) {
      const err = new Error("Invalid Status");
      err.statusCode = 400;
      throw err;
    }

    if (status) {
      filter.status = status;
    }

    if (range && !allowedRanges.includes(range)) {
      const err = new Error("Invalid Range");
      err.statusCode = 400;
      throw err;
    }

    if (from && new Date(from) > now) {
      const err = new Error("Starting Date can not be in future");
      err.statusCode = 400;
      throw err;
    }

    if (to && new Date(to) > now) {
      const err = new Error("Ending Date can not be in future");
      err.statusCode = 400;
      throw err;
    }

    if (range) {
      const now = new Date();

      switch (range) {
        case "today":
          fromDate = new Date();
          fromDate.setHours(0, 0, 0, 0);

          toDate = new Date();
          toDate.setHours(23, 59, 59, 999);
          break;

        case "yesterday":
          fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 1);
          fromDate.setHours(0, 0, 0, 0);

          toDate = new Date();
          toDate.setDate(toDate.getDate() - 1);
          toDate.setHours(23, 59, 59, 999);
          break;

        case "last7days":
          fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 6); // includes today
          fromDate.setHours(0, 0, 0, 0);

          toDate = new Date();
          toDate.setHours(23, 59, 59, 999);
          break;

        case "thismonth":
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1);

          toDate = new Date();
          toDate.setHours(23, 59, 59, 999);
          break;
      }
    } else {
      //  MANUAL DATE VALIDATION

      const isValidDate = (date) => !isNaN(new Date(date).getTime());

      if (from) {
        if (!isValidDate(from)) {
          const err = new Error("Invalid 'from' date");
          err.statusCode = 400;
          throw err;
        }
        fromDate = new Date(from);
      }

      if (to) {
        if (!isValidDate(to)) {
          const err = new Error("Invalid 'to' date");
          err.statusCode = 400;
          throw err;
        }
        toDate = new Date(to);
      }

      if (fromDate && toDate && fromDate > toDate) {
        const err = new Error("'from' cannot be greater than 'to'");
        err.statusCode = 400;
        throw err;
      }

      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
      }
    }

    //  APPLY DATE FILTER
    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) filter.createdAt.$gte = fromDate;
      if (toDate) filter.createdAt.$lte = toDate;
    }

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid User ID",
        });
      }

      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    const result = await WalletLedger.aggregate([
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
      //  SEARCH (optional)
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { "user.firstName": { $regex: search, $options: "i" } },
                  { "user.lastName": { $regex: search, $options: "i" } },
                  { "user.userName": { $regex: search, $options: "i" } },
                  { "user.phone": { $regex: search, $options: "i" } },
                  { referenceId: { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },

            {
              $project: {
                _id: 0,
                userId: "$userId",
                name: {
                  $concat: ["$user.firstName", " ", "$user.lastName"],
                },
                userName: "$user.userName",
                phone: "$user.phone",
                email: "$user.email",
                serviceType: 1,
                referenceId: 1,
                amount: { $ifNull: ["$amount", 0] },
                openingBalance: { $ifNull: ["$openingBalance", 0] },
                closingBalance: { $ifNull: ["$closingBalance", 0] },
                createdAt: 1,
              },
            },
          ],

          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    const formattedData = data.map((item) => ({
      ...item,
      amount: paiseToRupee(item.amount),
      openingBalance: paiseToRupee(item.openingBalance),
      closingBalance: paiseToRupee(item.closingBalance),
    }));

    return res.status(200).json({
      success: true,
      message: "User refill history fetched Successfully",
      data: formattedData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

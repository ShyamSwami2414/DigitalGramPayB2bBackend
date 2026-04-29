const FundRequest = require("../../models/fundRequestModel");
const User = require("../../models/userModel");
const UserWallet = require("../../models/userWallet");
const WalletLedger = require("../../models/walletLedgerModel");
const mongoose = require("mongoose");
const { paiseToRupee } = require("../../utils/money");

exports.fundRequestStats = async (req, res, next) => {
  try {
    let {
      userId = "",
      status = "",
      from = "",
      to = "",
      range = "",
    } = req.query;

    console.log(req.query);
    userId = userId?.trim();
    status = status?.trim().toLowerCase();

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

    const filter = {};

    const now = new Date();
    let fromDate, toDate;

    const allowedStatus = ["approved", "rejected", "pending"];
    const allowedRanges = ["today", "yesterday", "last7days", "thismonth"];

    if (status && !allowedStatus.includes(status)) {
      const err = new Error("Invalid Status");
      err.statusCode = 400;
      throw err;
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

    if (status) {
      filter.status = status?.toLowerCase();
    }

    if (range) {
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
        return res
          .status(400)
          .json({ success: false, message: "Invalid user ID" });
      }

      const userExist = await User.findOne({ _id: userId }).lean();

      if (!userExist) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    console.log(filter, "filter");

    const [result] = await FundRequest.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: null,
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          approved: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
          },

          total: { $sum: 1 },

          approvedAmount: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0] },
          },

          rejectedAmount: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, "$amount", 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          pending: 1,
          approved: 1,
          rejected: 1,
          approvedAmount: 1,
          rejectedAmount: 1,
          // total: 1
        },
      },
    ]);

    const formattedData = result
      ? {
          ...result,
          approvedAmount: paiseToRupee(result?.approvedAmount),
          rejectedAmount: paiseToRupee(result?.rejectedAmount),
        }
      : {
          pending: 0,
          approved: 0,
          rejected: 0,
          total: 0,
          approvedAmount: 0,
          rejectedAmount: 0,
        };

    return res.status(200).json({
      success: true,
      message: "Fund requests stats fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllFundRequests = async (req, res, next) => {
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
    console.log(req.query, "");

    page = Number(page);
    limit = Number(limit);
    search = search?.trim().toLowerCase();
    userId = userId?.trim();
    status = status?.trim().toLowerCase();

    from = typeof from === "string" ? from.trim().toLowerCase() : "";
    to = typeof to === "string" ? to.trim().toLowerCase() : "";
    range = typeof range === "string" ? range?.trim().toLowerCase() : "";

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

    const filter = {};
    const skip = (page - 1) * limit;

    const now = new Date();
    let fromDate, toDate;

    const allowedStatus = ["approved", "rejected", "pending"];
    const allowedRanges = ["today", "yesterday", "last7days", "thismonth"];

    if (status && !allowedStatus.includes(status)) {
      const err = new Error("Invalid Status");
      err.statusCode = 400;
      throw err;
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

    if (status) {
      filter.status = status?.toLowerCase();
    }

    if (range) {
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

    if (search) {
      const isNumber = !isNaN(search);

      filter.$or = [
        { referenceId: { $regex: search, $options: "i" } },
        { mode: { $regex: search, $options: "i" } },
        { utrNumber: { $regex: search, $options: "i" } },
        { rejectionReason: { $regex: search, $options: "i" } },

        ...(isNumber ? [{ amount: Number(search) }] : []),
      ];
    }

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user ID" });
      }

      const userExist = await User.findOne({ _id: userId }).lean();

      if (!userExist) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    console.log(filter, "filter");

    const fundRequests = await FundRequest.aggregate([
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
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          fullName: {
            $concat: ["$user.firstName", " ", "$user.lastName"],
          },
          userName: "$user.userName",
        },
      },
      {
        $project: {
          user: 0,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    console.log(fundRequests, "fundRequests");

    const total = await FundRequest.countDocuments(filter);

    const formattedData = fundRequests.map((item) => ({
      ...item,
      amount: paiseToRupee(item?.amount),
    }));

    return res.status(200).json({
      success: true,
      message: "Fund requests fetched successfully",
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

exports.approveFundRequest = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    let openingBalance = 0;
    let closingBalance = 0;

    if (!id) {
      const err = new Error("Invalid fund request ID");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid fund request ID");
      err.statusCode = 400;
      throw err;
    }

    const fundRequest = await FundRequest.findOneAndUpdate(
      {
        _id: id,
        status: "pending",
      },
      {
        $set: {
          status: "approved",
        },
      },
      {
        new: true,
        session,
      },
    );

    if (!fundRequest) {
      const err = new Error("Fund request already processed or not found");
      err.statusCode = 400;
      throw err;
    }

    const fundRequestUser = await User.findOne(
      {
        _id: fundRequest.userId,
        isDeleted: false,
      },
      null,
      { session },
    );

    if (!fundRequestUser) {
      const err = new Error("User not found");
      err.statusCode = 400;
      throw err;
    }

    const wallet = await UserWallet.findOneAndUpdate(
      {
        userId: fundRequest.userId,
        isDeleted: false,
      },
      {
        $inc: { mainWallet: fundRequest.amount },
      },
      { new: true, session },
    );

    if (!wallet) {
      const err = new Error("User wallet not found");
      err.statusCode = 400;
      throw err;
    }

    closingBalance = wallet.mainWallet;
    openingBalance = closingBalance - fundRequest.amount;

    await WalletLedger.create(
      [
        {
          userId: fundRequest.userId,
          entryType: "FUND_REQUEST",
          referenceId: fundRequest?.referenceId,
          wallet: "main",
          type: "credit",
          amount: fundRequest.amount,
          openingBalance: openingBalance,
          closingBalance: closingBalance,
          description: "Fund request approved",
        },
      ],
      { session },
    );

    await session.commitTransaction();

    const formattedData = fundRequest
      ? { ...fundRequest?._doc, amount: paiseToRupee(fundRequest?.amount) }
      : null;

    return res.status(200).json({
      success: true,
      message: "Fund request approved successfully",
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

exports.rejectFundRequest = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    let { rejectionReason } = req.body;
    rejectionReason = rejectionReason?.trim();

    if (!id) {
      const err = new Error("Fund request ID is required");
      err.statusCode = 400;
      throw err;
    }

    if (!rejectionReason) {
      const err = new Error("Rejection reason is required");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid fund request ID");
      err.statusCode = 400;
      throw err;
    }

    const fundRequest = await FundRequest.findOneAndUpdate(
      {
        _id: id,
        status: "pending",
      },
      {
        $set: {
          status: "rejected",
          rejectionReason: rejectionReason,
          rejectedAt: new Date(),
        },
      },
      {
        new: true,
        session,
      },
    );

    if (!fundRequest) {
      const err = new Error("Fund request already processed or not found");
      err.statusCode = 400;
      throw err;
    }

    await session.commitTransaction();

    const formattedData = fundRequest
      ? { ...fundRequest?.doc, amount: paiseToRupee(fundRequest?.amount) }
      : null;

    return res.status(200).json({
      success: true,
      message: "Fund request rejected successfully",
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

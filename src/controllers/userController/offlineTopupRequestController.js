const mongoose = require("mongoose");
const FundRequest = require("../../models/fundRequestModel");
const User = require("../../models/userModel");
const WalletTopupBank = require("../../models/walletTopupBankModel");
const { rupeeToPaise, paiseToRupee } = require("../../utils/money");
const {
  generateUniqueRefernceId,
} = require("../../utils/generateUniqueReferenceId");
const { sendEmail } = require("../../utils/email");

exports.getTopupRequestStats = async (req, res, next) => {
  try {
    let { status = "", from = "", to = "", range = "" } = req.query;
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

    const filter = { userId: new mongoose.Types.ObjectId(req.user.id) };
    const now = new Date();
    let fromDate, toDate;

    const allowedStatus = ["pending", "approved", "rejected"];
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
      filter.status = status;
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

    const [result] = await FundRequest.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalAmount: { $sum: "$amount" },

          //approved
          approvedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "approved"] }, 1, 0],
            },
          },
          approvedAmount: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0] },
          },

          //pending
          pendingCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
            },
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] },
          },

          //rejected
          rejectedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "rejected"] }, 1, 0],
            },
          },
          rejectedAmount: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, "$amount", 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          total: {
            count: "$totalCount",
            amount: "$totalAmount",
          },

          approved: {
            count: "$approvedCount",
            amount: "$approvedAmount",
          },

          pending: {
            count: "$pendingCount",
            amount: "$pendingAmount",
          },

          rejected: {
            count: "$rejectedCount",
            amount: "$rejectedAmount",
          },
        },
      },
    ]);

    const defaultStats = {
      total: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 },
    };

    const formattedData = result
      ? {
          ...result,
          total: {
            count: result?.total?.count,
            amount: paiseToRupee(result?.total?.amount),
          },

          approved: {
            count: result?.approved?.count,
            amount: paiseToRupee(result?.approved?.amount),
          },

          pending: {
            count: result?.pending?.count,
            amount: paiseToRupee(result?.pending?.amount),
          },

          rejected: {
            count: result?.rejected?.count,
            amount: paiseToRupee(result?.rejected?.amount),
          },
        }
      : defaultStats;

    return res.status(200).json({
      success: true,
      message: "Topup Request Stats",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllOfflineTopupRequests = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      status = "",
      search = "",
      from = "",
      to = "",
      range = "",
    } = req.query;

    page = Number(page);
    limit = Number(limit);

    status = status?.trim().toLowerCase();
    search = search?.trim();
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

    const filter = { userId: new mongoose.Types.ObjectId(req.user.id) };
    const skip = (page - 1) * limit;

    const now = new Date();
    let fromDate, toDate;

    const allowedStatus = ["pending", "approved", "rejected"];
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
      filter.status = status;
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

    const result = await FundRequest.aggregate([
      {
        $match: filter,
      },
      ...(search
        ? [
            {
              $addFields: {
                amountStr: { $toString: "$amount" },
              },
            },
          ]
        : []),

      ...(search
        ? [
            {
              $match: {
                $or: [
                  { referenceId: { $regex: search, $options: "i" } },
                  { amountStr: { $regex: search, $options: "i" } },
                  { mode: { $regex: search, $options: "i" } },
                  { utrNumber: { $regex: search, $options: "i" } },
                  { rejectionReason: { $regex: search, $options: "i" } },
                  { status: { $regex: search, $options: "i" } },
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
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const data = result?.[0]?.data || [];
    const total = result?.[0]?.totalCount?.[0]?.count || 0;

    const formattedData = data.map((item) => ({
      ...item,
      amount: paiseToRupee(item.amount),
    }));

    return res.status(200).json({
      success: true,
      message: "Offline topup requests fetched successfully",
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

exports.addOfflineTopupRequest = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    console.log(req.body, "body");
    let { amount, mode, receiverBank, utrNumber, paymentDate } = req.body;
    amount = Number(amount);

    const referenceId = generateUniqueRefernceId();

    mode = mode?.trim()?.toLowerCase();
    utrNumber = utrNumber?.trim();

    const amountInPaise = rupeeToPaise(amount);

    const paymentProof = req.file?.filename;
    const requiredFields = [
      "amount",
      "mode",
      "receiverBank",
      "utrNumber",
      "paymentDate",
    ];

    const missingFields = [];

    if (!paymentProof) {
      missingFields.push("paymentProof");
    }

    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      const err = new Error(
        `Missing required fields: ${missingFields.join(", ")}`,
      );
      err.statusCode = 400;
      throw err;
    }

    if (!Number.isFinite(amount)) {
      const err = new Error("Invalid amount");
      err.statusCode = 400;
      throw err;
    }

    if (amount <= 0) {
      const err = new Error("Amount must be greater than 0");
      err.statusCode = 400;
      throw err;
    }

    if (new Date(paymentDate) > new Date()) {
      const err = new Error("Payment date cannot be in the future");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(receiverBank)) {
      const err = new Error("Invalid receiver bank ID");
      err.statusCode = 400;
      throw err;
    }

    const [userExist, receiverBankExist, requestExist] = await Promise.all([
      User.findOne({
        _id: req.user.id,
        isActive: true,
        isDeleted: false,
      })
        .select("email userName")
        .lean(),

      WalletTopupBank.findOne({
        _id: receiverBank,
        isDeleted: false,
        isActive: true,
      }).lean(),

      FundRequest.findOne({
        utrNumber: utrNumber,
        status: { $ne: "rejected" },
      }).lean(),
    ]);

    if (!userExist) {
      const err = new Error("No active user found");
      err.statusCode = 404;
      throw err;
    }

    if (!receiverBankExist) {
      const err = new Error("Receiver bank not found or disabled");
      err.statusCode = 404;
      throw err;
    }

    if (requestExist) {
      const err = new Error("Topup request already exists");
      err.statusCode = 409;
      throw err;
    }

    const offlineTopupRequest = new FundRequest({
      userId: req.user.id,
      referenceId: referenceId,
      amount: amountInPaise,
      mode,
      walletTopupBankId: receiverBank,
      utrNumber,
      paymentDate,
      paymentProof: `/uploads/paymentProof/${paymentProof}`,
    });

    await offlineTopupRequest.save();

    await session.commitTransaction();

    await sendEmail(
      userExist.email,
      [],
      [],
      "New Topup request",
      `A new topup request is received by ${userExist?.userName} for ${amount} rupees`,
    );

    return res.status(201).json({
      success: true,
      message: "Offline topup request added successfully",
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    session.endSession;
  }
};

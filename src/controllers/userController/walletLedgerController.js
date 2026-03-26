const mongoose = require("mongoose");
const WalletLedger = require("../../models/walletLedgerModel");
const RechargeReport = require("../../models/rechargeReportModel");
const BbpsReport = require("../../models/bbpsReportModel");
const User = require("../../models/userModel");
const { paiseToRupee } = require("../../utils/money");

//wallet stats from leedger and report combined
exports.getWalletStats = async (req, res, next) => {
  try {
    let { user = "", status = "", from = "", to = "", range = "" } = req.query;
    console.log(req.query);
    user = user?.trim();
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

    const allowedStatus = ["success", "failed", "pending"];
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
      filter.status = status?.toUpperCase();
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

    if (user) {
      if (!mongoose.Types.ObjectId.isValid(user)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user ID" });
      }

      const userExist = await User.findOne({ _id: user }).lean();

      if (!userExist) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      if (
        userExist._id.toString() !== req.user.id.toString() && // not self
        userExist.parentUserId?.toString() !== req.user.id.toString() // not child
      ) {
        return res.status(403).json({
          success: false,
          message: "Not allowed to access this user",
        });
      }
    }

    const [result] = await RechargeReport.aggregate([
      { $match: filter },

      {
        $unionWith: {
          coll: "bbpsreports",
          pipeline: [{ $match: filter }],
        },
      },

      {
        $unionWith: {
          coll: "walletledgers",
          pipeline: [
            { $match: filter },
            {
              $project: {
                amount: 1,
                type: 1,
                source: { $literal: "WALLET" },

                status: { $literal: null },
                netCommission: { $literal: 0 },
                isRefunded: { $literal: false },
                charge: { $literal: 0 },
              },
            },
          ],
        },
      },

      {
        $group: {
          _id: null,

          totalCount: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          totalCommission: { $sum: "$netCommission" },

          successCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "SUCCESS"] }, 1, 0],
            },
          },
          successAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "SUCCESS"] }, "$amount", 0],
            },
          },

          pendingCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0],
            },
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "PENDING"] }, "$amount", 0],
            },
          },

          failedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0],
            },
          },
          failedAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "FAILED"] }, "$amount", 0],
            },
          },

          refundCount: {
            $sum: {
              $cond: ["$isRefunded", 1, 0],
            },
          },
          refundAmount: {
            $sum: {
              $cond: ["$isRefunded", "$amount", 0],
            },
          },

          totalCredit: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$type", "credit"] },
                    { $eq: ["$source", "WALLET"] },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },

          totalDebit: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$type", "debit"] },
                    { $eq: ["$source", "WALLET"] },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },

          totalCommission: {
            $sum: "$netCommission",
          },

          totalCharges: {
            $sum: "$charge",
          },
        },
      },

      {
        $project: {
          _id: 0,

          total: {
            // count: "$totalCount",
            // amount: "$totalAmount",
            commission: "$totalCommission",
          },

          success: {
            count: "$successCount",
            amount: "$successAmount",
          },

          pending: {
            count: "$pendingCount",
            amount: "$pendingAmount",
          },

          failed: {
            count: "$failedCount",
            amount: "$failedAmount",
          },

          refund: {
            count: "$refundCount",
            amount: "$refundAmount",
          },

          totalCredit: "$totalCredit",
          totalDebit: "$totalDebit",
          totalCommission: "$totalCommission",
          totalCharges: "$totalCharges",
        },
      },
    ]);

    const formattedData = result
      ? {
          ...result,
          total: {
            // count: result?.total?.count,
            // amount: paiseToRupee(result?.total?.amount),
            commission: paiseToRupee(result?.total?.commission),
          },

          success: {
            count: result?.success?.count,
            amount: paiseToRupee(result?.success?.amount),
          },

          pending: {
            count: result?.pending?.count,
            amount: paiseToRupee(result?.pending?.amount),
          },

          failed: {
            count: result?.failed?.count,
            amount: paiseToRupee(result?.failed?.amount),
          },

          refund: {
            count: result?.refund?.count,
            amount: paiseToRupee(result?.refund?.amount),
          },

          totalCredit: paiseToRupee(result?.totalCredit),
          totalDebit: paiseToRupee(result?.totalDebit),
          totalCommission: paiseToRupee(result?.totalCommission),
          totalCharges: paiseToRupee(result?.totalCharges),
        }
      : null;

    return res.status(200).json({
      success: true,
      message: "Wallet Ledger - Report Stats ",
      data: formattedData,
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

    const formattedData = walletTransferHistory.map((item) => ({
      ...item,

      amount: paiseToRupee(item.amount),
      openingBalance: paiseToRupee(item.openingBalance),
      closingBalance: paiseToRupee(item.closingBalance),
    }));

    return res.status(200).json({
      success: true,
      message: "Wallet transaction history fetched successfully",
      data: formattedData,
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
      {
        $match: {
          _id: new mongoose.Types.ObjectId(userId),
        },
      },

      //Get full downline tree
      {
        $graphLookup: {
          from: "users",
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "parentUserId",
          as: "downline",
          maxDepth: 10,
          depthField: "depth",
        },
      },

      // Merge self + downline
      {
        $project: {
          allUsers: {
            $concatArrays: [["$$ROOT"], "$downline"],
          },
        },
      },

      { $unwind: "$allUsers" },

      {
        $lookup: {
          from: "walletledgers",
          localField: "allUsers._id",
          foreignField: "userId",
          as: "transactions",
        },
      },

      // Flatten transactions
      { $unwind: "$transactions" },

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

          user: {
            _id: "$allUsers._id",
            firstName: "$allUsers.firstName",
            lastName: "$allUsers.lastName",
            userName: "$allUsers.userName",
            level: "$allUsers.level",
          },
        },
      },

      { $sort: { createdAt: -1 } },

      { $skip: skip },
      { $limit: limit },
    ]);

    const formattedData = walletReport.map((item) => ({
      ...item,

      amount: paiseToRupee(item.amount),
      openingBalance: paiseToRupee(item.openingBalance),
      closingBalance: paiseToRupee(item.closingBalance),
    }));

    return res.status(200).json({
      success: true,
      message: "Wallet report fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

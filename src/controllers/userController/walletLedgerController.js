const mongoose = require("mongoose");
const WalletLedger = require("../../models/walletLedgerModel");
const RechargeReport = require("../../models/rechargeReportModel");
const BbpsReport = require("../../models/bbpsReportModel");
const User = require("../../models/userModel");
const { paiseToRupee } = require("../../utils/money");

//wallet stats from leedger and report combined
// exports.getWalletStats = async (req, res, next) => {
//   try {
//     let { user = "", status = "", from = "", to = "", range = "" } = req.query;
//     console.log(req.query);
//     user = user?.trim();
//     status = status?.trim().toLowerCase();

//     range = typeof range === "string" ? range?.trim().toLowerCase() : "";
//     from = typeof from === "string" ? from.trim().toLowerCase() : "";
//     to = typeof to === "string" ? to.trim().toLowerCase() : "";

//     // normalize invalid inputs
//     if (!from || from === "null" || from === "undefined") {
//       from = undefined;
//     }

//     if (!to || to === "null" || to === "undefined") {
//       to = undefined;
//     }

//     if (!range || range === "null" || range === "undefined") {
//       range = undefined;
//     }

//     const filter = {};

//     const now = new Date();
//     let fromDate, toDate;

//     const allowedStatus = ["success", "failed", "pending"];
//     const allowedRanges = ["today", "yesterday", "last7days", "thismonth"];

//     if (status && !allowedStatus.includes(status)) {
//       const err = new Error("Invalid Status");
//       err.statusCode = 400;
//       throw err;
//     }

//     if (range && !allowedRanges.includes(range)) {
//       const err = new Error("Invalid Range");
//       err.statusCode = 400;
//       throw err;
//     }

//     if (from && new Date(from) > now) {
//       const err = new Error("Starting Date can not be in future");
//       err.statusCode = 400;
//       throw err;
//     }

//     if (to && new Date(to) > now) {
//       const err = new Error("Ending Date can not be in future");
//       err.statusCode = 400;
//       throw err;
//     }

//     if (status) {
//       filter.status = status?.toUpperCase();
//     }

//     if (range) {
//       switch (range) {
//         case "today":
//           fromDate = new Date();
//           fromDate.setHours(0, 0, 0, 0);

//           toDate = new Date();
//           toDate.setHours(23, 59, 59, 999);
//           break;

//         case "yesterday":
//           fromDate = new Date();
//           fromDate.setDate(fromDate.getDate() - 1);
//           fromDate.setHours(0, 0, 0, 0);

//           toDate = new Date();
//           toDate.setDate(toDate.getDate() - 1);
//           toDate.setHours(23, 59, 59, 999);
//           break;

//         case "last7days":
//           fromDate = new Date();
//           fromDate.setDate(fromDate.getDate() - 6); // includes today
//           fromDate.setHours(0, 0, 0, 0);

//           toDate = new Date();
//           toDate.setHours(23, 59, 59, 999);
//           break;

//         case "thismonth":
//           fromDate = new Date(now.getFullYear(), now.getMonth(), 1);

//           toDate = new Date();
//           toDate.setHours(23, 59, 59, 999);
//           break;
//       }
//     } else {
//       //  MANUAL DATE VALIDATION

//       const isValidDate = (date) => !isNaN(new Date(date).getTime());

//       if (from) {
//         if (!isValidDate(from)) {
//           const err = new Error("Invalid 'from' date");
//           err.statusCode = 400;
//           throw err;
//         }
//         fromDate = new Date(from);
//       }

//       if (to) {
//         if (!isValidDate(to)) {
//           const err = new Error("Invalid 'to' date");
//           err.statusCode = 400;
//           throw err;
//         }
//         toDate = new Date(to);
//       }

//       if (fromDate && toDate && fromDate > toDate) {
//         const err = new Error("'from' cannot be greater than 'to'");
//         err.statusCode = 400;
//         throw err;
//       }

//       if (toDate) {
//         toDate.setHours(23, 59, 59, 999);
//       }
//     }

//     //  APPLY DATE FILTER
//     if (fromDate || toDate) {
//       filter.createdAt = {};

//       if (fromDate) filter.createdAt.$gte = fromDate;
//       if (toDate) filter.createdAt.$lte = toDate;
//     }

//     if (user) {
//       if (!mongoose.Types.ObjectId.isValid(user)) {
//         return res
//           .status(400)
//           .json({ success: false, message: "Invalid user ID" });
//       }

//       const userExist = await User.findOne({ _id: user }).lean();

//       if (!userExist) {
//         return res
//           .status(404)
//           .json({ success: false, message: "User not found" });
//       }

//       if (
//         userExist._id.toString() !== req.user.id.toString() && // not self
//         userExist.parentUserId?.toString() !== req.user.id.toString() // not child
//       ) {
//         return res.status(403).json({
//           success: false,
//           message: "Not allowed to access this user",
//         });
//       }

//       filter.userId = new mongoose.Types.ObjectId(user);
//     }

//     const [result] = await RechargeReport.aggregate([
//       { $match: filter },

//       {
//         $unionWith: {
//           coll: "bbpsreports",
//           pipeline: [{ $match: filter }],
//         },
//       },

//       {
//         $unionWith: {
//           coll: "walletledgers",
//           pipeline: [
//             { $match: filter },
//             {
//               $project: {
//                 amount: 1,
//                 type: 1,
//                 source: { $literal: "WALLET" },

//                 status: { $literal: null },
//                 netCommission: { $literal: 0 },
//                 isRefunded: { $literal: false },
//                 charge: { $literal: 0 },
//               },
//             },
//           ],
//         },
//       },

//       {
//         $group: {
//           _id: null,

//           totalCount: { $sum: 1 },
//           totalAmount: { $sum: "$amount" },
//           totalCommission: { $sum: "$netCommission" },

//           successCount: {
//             $sum: {
//               $cond: [{ $eq: ["$status", "SUCCESS"] }, 1, 0],
//             },
//           },
//           successAmount: {
//             $sum: {
//               $cond: [{ $eq: ["$status", "SUCCESS"] }, "$amount", 0],
//             },
//           },

//           pendingCount: {
//             $sum: {
//               $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0],
//             },
//           },
//           pendingAmount: {
//             $sum: {
//               $cond: [{ $eq: ["$status", "PENDING"] }, "$amount", 0],
//             },
//           },

//           failedCount: {
//             $sum: {
//               $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0],
//             },
//           },
//           failedAmount: {
//             $sum: {
//               $cond: [{ $eq: ["$status", "FAILED"] }, "$amount", 0],
//             },
//           },

//           refundCount: {
//             $sum: {
//               $cond: ["$isRefunded", 1, 0],
//             },
//           },
//           refundAmount: {
//             $sum: {
//               $cond: ["$isRefunded", "$amount", 0],
//             },
//           },

//           totalCredit: {
//             $sum: {
//               $cond: [
//                 {
//                   $and: [
//                     { $eq: ["$type", "credit"] },
//                     { $eq: ["$source", "WALLET"] },
//                   ],
//                 },
//                 "$amount",
//                 0,
//               ],
//             },
//           },

//           totalDebit: {
//             $sum: {
//               $cond: [
//                 {
//                   $and: [
//                     { $eq: ["$type", "debit"] },
//                     { $eq: ["$source", "WALLET"] },
//                   ],
//                 },
//                 "$amount",
//                 0,
//               ],
//             },
//           },

//           totalCommission: {
//             $sum: "$netCommission",
//           },

//           totalCharges: {
//             $sum: "$charge",
//           },
//         },
//       },

//       {
//         $project: {
//           _id: 0,

//           total: {
//             // count: "$totalCount",
//             // amount: "$totalAmount",
//             commission: "$totalCommission",
//           },

//           success: {
//             count: "$successCount",
//             amount: "$successAmount",
//           },

//           pending: {
//             count: "$pendingCount",
//             amount: "$pendingAmount",
//           },

//           failed: {
//             count: "$failedCount",
//             amount: "$failedAmount",
//           },

//           refund: {
//             count: "$refundCount",
//             amount: "$refundAmount",
//           },

//           totalCredit: "$totalCredit",
//           totalDebit: "$totalDebit",
//           totalCommission: "$totalCommission",
//           totalCharges: "$totalCharges",
//         },
//       },
//     ]);

//     const formattedData = result
//       ? {
//           ...result,
//           total: {
//             // count: result?.total?.count,
//             // amount: paiseToRupee(result?.total?.amount),
//             commission: paiseToRupee(result?.total?.commission),
//           },

//           success: {
//             count: result?.success?.count,
//             amount: paiseToRupee(result?.success?.amount),
//           },

//           pending: {
//             count: result?.pending?.count,
//             amount: paiseToRupee(result?.pending?.amount),
//           },

//           failed: {
//             count: result?.failed?.count,
//             amount: paiseToRupee(result?.failed?.amount),
//           },

//           refund: {
//             count: result?.refund?.count,
//             amount: paiseToRupee(result?.refund?.amount),
//           },

//           totalCredit: paiseToRupee(result?.totalCredit),
//           totalDebit: paiseToRupee(result?.totalDebit),
//           totalCommission: paiseToRupee(result?.totalCommission),
//           totalCharges: paiseToRupee(result?.totalCharges),
//         }
//       : null;

//     return res.status(200).json({
//       success: true,
//       message: "Wallet Ledger - Report Stats ",
//       data: formattedData,
//     });
//   } catch (error) {
//     next(error);
//   }
// };
exports.getWalletStats = async (req, res, next) => {
  try {
    let { user = "", status = "", from = "", to = "", range = "" } = req.query;

    user = user?.trim();
    status = status?.trim().toLowerCase();

    range = typeof range === "string" ? range?.trim().toLowerCase() : "";
    from = typeof from === "string" ? from.trim() : "";
    to = typeof to === "string" ? to.trim() : "";

    if (!from || from === "null" || from === "undefined") from = undefined;
    if (!to || to === "null" || to === "undefined") to = undefined;
    if (!range || range === "null" || range === "undefined") range = undefined;

    const now = new Date();
    let fromDate, toDate;

    const allowedStatus = ["success", "failed", "pending"];
    const allowedRanges = ["today", "yesterday", "last7days", "thismonth"];

    // ❗ VALIDATIONS
    if (status && !allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Invalid Status" });
    }

    if (range && !allowedRanges.includes(range)) {
      return res.status(400).json({ message: "Invalid Range" });
    }

    if (from && new Date(from) > now) {
      return res.status(400).json({ message: "From date in future" });
    }

    if (to && new Date(to) > now) {
      return res.status(400).json({ message: "To date in future" });
    }

    // 📅 DATE LOGIC
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
          fromDate.setDate(fromDate.getDate() - 6);
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
      const isValidDate = (d) => !isNaN(new Date(d).getTime());

      if (from) {
        if (!isValidDate(from))
          return res.status(400).json({ message: "Invalid from date" });
        fromDate = new Date(from);
      }

      if (to) {
        if (!isValidDate(to))
          return res.status(400).json({ message: "Invalid to date" });
        toDate = new Date(to);
      }

      if (fromDate && toDate && fromDate > toDate) {
        return res
          .status(400)
          .json({ message: "'from' cannot be greater than 'to'" });
      }

      if (toDate) toDate.setHours(23, 59, 59, 999);
    }

    // 🔐 USER ACCESS + USER IDS
    let userIds = [];

    if (user) {
      // 👉 ONLY selected user
      if (!mongoose.Types.ObjectId.isValid(user)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const userExist = await User.findById(user).lean();

      if (!userExist) {
        return res.status(404).json({ message: "User not found" });
      }

      if (
        userExist._id.toString() !== req.user.id.toString() &&
        userExist.parentUserId?.toString() !== req.user.id.toString()
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      userIds = [new mongoose.Types.ObjectId(user)];
    } else {
      // 👉 SELF + DOWNLINE
      const downline = await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(req.user.id) } },
        {
          $graphLookup: {
            from: "users",
            startWith: "$_id",
            connectFromField: "_id",
            connectToField: "parentUserId",
            as: "downline",
          },
        },
        {
          $project: {
            allIds: {
              $concatArrays: [
                ["$_id"],
                {
                  $map: {
                    input: "$downline",
                    as: "d",
                    in: "$$d._id",
                  },
                },
              ],
            },
          },
        },
      ]);

      userIds = downline[0]?.allIds || [
        new mongoose.Types.ObjectId(req.user.id),
      ];
    }

    // 📌 BASE FILTER
    const baseFilter = {
      userId: { $in: userIds },
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate && { $gte: fromDate }),
              ...(toDate && { $lte: toDate }),
            },
          }
        : {}),
    };

    const rechargeFilter = {
      ...baseFilter,
      ...(status && { status: status.toUpperCase() }),
    };

    const bbpsFilter = {
      ...baseFilter,
      ...(status && { status: status.toUpperCase() }),
    };

    const walletFilter = {
      ...baseFilter,
    };

    // 🚀 AGGREGATION
    const [result] = await RechargeReport.aggregate([
      { $match: rechargeFilter },
      {
        $project: {
          amount: 1,
          status: 1,
          netCommission: 1,
          isRefunded: 1,
          charge: { $literal: 0 },
          type: { $literal: null },
          source: { $literal: "RECHARGE" },
        },
      },

      {
        $unionWith: {
          coll: "bbpsreports",
          pipeline: [
            { $match: bbpsFilter },
            {
              $project: {
                amount: 1,
                status: 1,
                netCommission: 1,
                isRefunded: 1,
                charge: { $literal: 0 },
                type: { $literal: null },
                source: { $literal: "BBPS" },
              },
            },
          ],
        },
      },

      {
        $unionWith: {
          coll: "walletledgers",
          pipeline: [
            { $match: walletFilter },
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

          successCount: {
            $sum: { $cond: [{ $eq: ["$status", "SUCCESS"] }, 1, 0] },
          },
          successAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "SUCCESS"] }, "$amount", 0],
            },
          },

          pendingCount: {
            $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] },
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "PENDING"] }, "$amount", 0],
            },
          },

          failedCount: {
            $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] },
          },
          failedAmount: {
            $sum: {
              $cond: [{ $eq: ["$status", "FAILED"] }, "$amount", 0],
            },
          },

          refundCount: {
            $sum: { $cond: ["$isRefunded", 1, 0] },
          },
          refundAmount: {
            $sum: { $cond: ["$isRefunded", "$amount", 0] },
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

          totalCommission: { $sum: "$netCommission" },
          totalCharges: { $sum: "$charge" },
        },
      },

      {
        $project: {
          _id: 0,
          total: { commission: "$totalCommission" },
          success: { count: "$successCount", amount: "$successAmount" },
          pending: { count: "$pendingCount", amount: "$pendingAmount" },
          failed: { count: "$failedCount", amount: "$failedAmount" },
          refund: { count: "$refundCount", amount: "$refundAmount" },
          totalCredit: 1,
          totalDebit: 1,
          totalCommission: 1,
          totalCharges: 1,
        },
      },
    ]);

    const defaultStats = {
      total: { commission: 0 },
      success: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      failed: { count: 0, amount: 0 },
      refund: { count: 0, amount: 0 },
      totalCredit: 0,
      totalDebit: 0,
      totalCommission: 0,
      totalCharges: 0,
    };

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
      : defaultStats;

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
    let {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      from = "",
      to = "",
      range = "",
    } = req.query;

    page = Number(page);
    limit = Number(limit);
    search = search?.trim();
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

    const skip = (page - 1) * limit;
    const filter = {
      userId: new mongoose.Types.ObjectId(req.user.id),
      wallet: "main",
      serviceType: "AEPSTOMAIN",
    };

    console.log(req.query);

    const now = new Date();
    let fromDate, toDate;

    const allowedStatus = ["success", "failed", "pending", "refunded"];
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

    const result = await WalletLedger.aggregate([
      {
        $match: filter,
      },
      ...(search
        ? [
            {
              $addFields: {
                amountStr: { $toString: "$amount" },
                openingBalanceStr: { $toString: "$openingBalance" },
                closingBalanceStr: { $toString: "$closingBalance" },
              },
            },
          ]
        : []),
      ...(search
        ? [
            {
              $match: {
                $or: [
                  {
                    referenceId: { $regex: search, $options: "i" },
                  },
                  {
                    amountStr: { $regex: search, $options: "i" },
                  },
                  {
                    openingBalanceStr: { $regex: search, $options: "i" },
                  },
                  {
                    closingBalanceStr: { $regex: search, $options: "i" },
                  },
                ],
              },
            },
          ]
        : []),
      {
        $facet: {
          data: [
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
          ],
          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    const data = result?.[0]?.data || [];
    const total = result?.[0]?.totalCount[0]?.count || 0;

    const formattedData = data.map((item) => ({
      ...item,

      amount: paiseToRupee(item.amount),
      openingBalance: paiseToRupee(item.openingBalance),
      closingBalance: paiseToRupee(item.closingBalance),
    }));

    return res.status(200).json({
      success: true,
      message: "Wallet transaction history fetched successfully",
      data: formattedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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
      wallet = "",
      type = "",
      user = "",
      status = "",
      from = "",
      to = "",
      range = "",
    } = req.query;

    page = Number(page);
    limit = Number(limit);
    wallet = wallet?.trim().toLowerCase();
    type = type?.trim().toLowerCase();
    search = search?.trim();
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

    const skip = (page - 1) * limit;
    const filter = {};

    let {} = req.query;
    console.log(req.query);

    const now = new Date();
    let fromDate, toDate;

    const allowedStatus = ["success", "failed", "pending", "refunded"];
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

    const walletReport = await WalletLedger.aggregate([
      // 1️⃣ ACCESS CONTROL (SELF OR SELECTED USER TREE)
      {
        $lookup: {
          from: "users",
          pipeline: [
            {
              $match: {
                _id: new mongoose.Types.ObjectId(user || req.user.id),
              },
            },
            {
              $graphLookup: {
                from: "users",
                startWith: "$_id",
                connectFromField: "_id",
                connectToField: "parentUserId",
                as: "downline",
              },
            },
            {
              $project: {
                allUserIds: {
                  $map: {
                    input: {
                      $concatArrays: [["$$ROOT"], "$downline"],
                    },
                    as: "u",
                    in: "$$u._id",
                  },
                },
              },
            },
          ],
          as: "access",
        },
      },

      {
        $addFields: {
          allowedUserIds: {
            $arrayElemAt: ["$access.allUserIds", 0],
          },
        },
      },

      {
        $match: {
          $expr: {
            $in: ["$userId", "$allowedUserIds"],
          },
        },
      },

      // 2️⃣ FILTERS
      {
        $match: {
          ...(wallet && { wallet }),
          ...(type && { type }),
          ...(fromDate &&
            toDate && {
              createdAt: { $gte: fromDate, $lte: toDate },
            }),
          ...(search && {
            referenceId: { $regex: search, $options: "i" },
          }),
        },
      },

      // 3️⃣ ❌ REMOVE COMMISSION ROWS
      {
        $match: {
          serviceType: { $ne: "COMMISSION" },
        },
      },

      // 4️⃣ 🔥 MERGE COMMISSION FROM LEDGER
      {
        $lookup: {
          from: "walletledgers",
          let: { refId: "$referenceId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$referenceId", "$$refId"] },
                    { $eq: ["$serviceType", "COMMISSION"] },
                    { $eq: ["$type", "credit"] },
                  ],
                },
              },
            },
          ],
          as: "commissionEntry",
        },
      },

      {
        $addFields: {
          commission: {
            $ifNull: [{ $sum: "$commissionEntry.amount" }, 0],
          },
        },
      },

      // 5️⃣ FETCH SERVICE DATA
      {
        $lookup: {
          from: "rechargereports",
          localField: "referenceId",
          foreignField: "referenceId",
          as: "rechargeData",
        },
      },
      {
        $lookup: {
          from: "bbpsreports",
          localField: "referenceId",
          foreignField: "referenceId",
          as: "bbpsData",
        },
      },

      // 6️⃣ MERGE SERVICE DATA
      {
        $addFields: {
          serviceData: {
            $cond: [
              { $gt: [{ $size: "$rechargeData" }, 0] },
              { $arrayElemAt: ["$rechargeData", 0] },
              { $arrayElemAt: ["$bbpsData", 0] },
            ],
          },
        },
      },

      // 7️⃣ 🔥 REFUND LOGIC (FROM REPORTS)
      {
        $addFields: {
          isRefunded: {
            $ifNull: ["$serviceData.isRefunded", false],
          },
        },
      },

      // 8️⃣ JOIN USER
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      // 9️⃣ FINAL OUTPUT
      {
        $project: {
          _id: 1,
          date: "$createdAt",

          userName: {
            $concat: ["$user.firstName", " ", "$user.lastName"],
          },
          userId: "$user.userName",

          serviceName: {
            $ifNull: ["$serviceData.operatorName", "Wallet"],
          },

          serviceCategory: {
            $cond: [
              "$isRefunded",
              "REFUND",
              { $ifNull: ["$serviceData.serviceType", "$serviceType"] },
            ],
          },

          referenceId: 1,

          // 🔥 CORE LEDGER DATA
          txnAmount: "$amount",
          type: 1,

          openingBalance: 1,
          closingBalance: 1,

          // 🔥 MERGED FINANCIAL DATA
          commission: 1,

          charges: {
            $ifNull: ["$serviceData.charge", 0],
          },

          gst: {
            $ifNull: ["$serviceData.gst", 0],
          },

          tds: {
            $ifNull: ["$serviceData.tds", 0],
          },

          // 🔥 FINAL STATUS FIX
          status: {
            $cond: [
              "$isRefunded",
              "SUCCESS",
              { $ifNull: ["$serviceData.status", "SUCCESS"] },
            ],
          },

          message: {
            $cond: [
              "$isRefunded",
              "Refund Processed",
              { $ifNull: ["$serviceData.description", "$description"] },
            ],
          },

          isRefunded: 1,
        },
      },

      { $sort: { date: -1 } },

      // 🔟 PAGINATION
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const data = walletReport[0]?.data || [];
    const total = walletReport[0]?.totalCount[0]?.count || 0;

    const formattedData = data.map((item) => ({
      ...item,
      txnAmount: paiseToRupee(item.txnAmount),
      openingBalance: paiseToRupee(item.openingBalance),
      closingBalance: paiseToRupee(item.closingBalance),
      commission: paiseToRupee(item.commission),
      tds: paiseToRupee(item.tds),
      gst: paiseToRupee(item.gst),
    }));

    return res.status(200).json({
      success: true,
      message: "Wallet report fetched successfully",
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

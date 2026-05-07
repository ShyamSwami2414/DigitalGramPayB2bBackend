const mongoose = require("mongoose");
const FundRequest = require("../../models/fundRequestModel");
const WalletTopupBank = require("../../models/walletTopupBankModel");
const { rupeeToPaise, paiseToRupee } = require("../../utils/money");
const {
  generateUniqueRefernceId,
} = require("../../utils/generateUniqueReferenceId");
const Payout = require("../../models/sozopayoutTransactionModel");

exports.getTopupStats = async (req, res, next) => {
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
          //   approvedCount: {
          //     $sum: {
          //       $cond: [{ $eq: ["$status", "approved"] }, 1, 0],
          //     },
          //   },
          //   approvedAmount: {
          //     $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0] },
          //   },

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
          //   rejectedCount: {
          //     $sum: {
          //       $cond: [{ $eq: ["$status", "rejected"] }, 1, 0],
          //     },
          //   },
          //   rejectedAmount: {
          //     $sum: { $cond: [{ $eq: ["$status", "rejected"] }, "$amount", 0] },
          //   },
        },
      },
      {
        $project: {
          _id: 0,
          total: {
            count: "$totalCount",
            amount: "$totalAmount",
          },

          pending: {
            count: "$pendingCount",
            amount: "$pendingAmount",
          },
        },
      },
    ]);

    const defaultStats = {
      total: { count: 0, amount: 0 },

      pending: { count: 0, amount: 0 },
    };

    const formattedData = result
      ? {
          ...result,
          total: {
            count: result?.total?.count,
            amount: paiseToRupee(result?.total?.amount),
          },

          pending: {
            count: result?.pending?.count,
            amount: paiseToRupee(result?.pending?.amount),
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

exports.getPayoutMonthlyStats = async (req, res, next) => {
  try {
    let { year, serviceType } = req.query;
    serviceType = serviceType?.trim().toLowerCase();
    console.log();

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();

    const allowedServiceTypes = ["aeps", "xpress"];

    if (serviceType && !allowedServiceTypes.includes(serviceType)) {
      const err = new Error("Invalid serviceType");
      err.statusCode = 400;
      throw err;
    }

    const startDate = new Date(`${selectedYear}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${selectedYear}-12-31T23:59:59.999Z`);

    const match = {
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (serviceType === "aeps") {
       match.serviceType = "AEPS_PAYOUT";
     
    }else if(serviceType === "xpress"){
       match.serviceType = "XPRESS_PAYOUT";
    }

    const data = await Payout.aggregate([
      { $match: match },

      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          totalAmount: { $sum: "$amount" },
        },
      },

      {
        $project: {
          _id: 0,
          month: "$_id.month",
          totalAmount: 1,
        },
      },

      { $sort: { month: 1 } },
    ]);

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const formatted = monthNames.map((name, index) => {
      const found = data.find((d) => d.month === index + 1);

      return {
        month: name,
        amount: paiseToRupee(found?.totalAmount) || 0,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Monthly payout stats fetched",
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

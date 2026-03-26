const FundRequest = require("../../models/fundRequestModel");
const User = require("../../models/userModel");
const Service = require("../../models/serviceModel");
const mongoose = require("mongoose");
const { paiseToRupee } = require("../../utils/money");

exports.getDashboardOverview = async (req, res, next) => {
  try {
    let {
      user = "",
      service = "",
      status = "",
      from = "",
      to = "",
      range = "today",
    } = req.query;

    console.log(req.query);
    user = user?.trim();
    service = service?.trim();
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

      filter.userId = new mongoose.Types.ObjectId(user);
    }

    if (service) {
      if (!mongoose.Types.ObjectId.isValid(service)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid service ID" });
      }

      const serviceExist = await Service.findOne({ _id: service }).lean();

      if (!serviceExist) {
        return res
          .status(404)
          .json({ success: false, message: "Service not found" });
      }
    }

    console.log(filter, "filter");

    const [result] = await FundRequest.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalAmount: { $sum: "$amount" },

          approvedCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "approved"] }, 1, 0],
            },
          },
          approvedAmount: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0] },
          },

          pendingCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
            },
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] },
          },

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

    const totalCount = result?.total?.count || 0;

    const getPercent = (value) => {
      if (!totalCount) return 0;
      return Number(((value / totalCount) * 100).toFixed(2));
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
            percent: getPercent(result?.approved?.count),
          },

          pending: {
            count: result?.pending?.count,
            amount: paiseToRupee(result?.pending?.amount),
            percent: getPercent(result?.pending?.count),
          },

          rejected: {
            count: result?.rejected?.count,
            amount: paiseToRupee(result?.rejected?.amount),
            percent: getPercent(result?.rejected?.count),
          },
        }
      : defaultStats;

    return res.status(200).json({
      success: true,
      message: "Fetched Successful",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

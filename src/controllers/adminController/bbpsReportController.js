const mongoose = require("mongoose");
const User = require("../../models/userModel");
const BbpsReport = require("../../models/bbpsReportModel");
const { paiseToRupee } = require("../../utils/money");

exports.getBbpsStats = async (req, res, next) => {
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

    console.log(filter, "filter");

    const result = await BbpsReport.aggregate([
      {
        $match: filter,
      },
      {
        $facet: {
          totalSuccess: [
            { $match: { status: "SUCCESS" } },
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 },
                totalAmount: { $sum: "$amount" },
              },
            },
          ],
          totalPending: [
            { $match: { status: "PENDING" } },
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 },
                totalAmount: { $sum: "$amount" },
              },
            },
          ],
          totalFailed: [
            { $match: { status: "FAILED" } },
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 },
                totalAmount: { $sum: "$amount" },
              },
            },
          ],
          commissionOverview: [
            {
              $group: {
                _id: null,
                totalDays: { $sum: 1 }, // Or calculate distinct days if needed
                totalCommission: { $sum: "$commission" },
              },
            },
          ],
        },
      },
    ]);

    // Format defaults in case no records found
    const stats = {
      totalSuccess: { totalCount: 0, totalAmount: 0 },
      totalPending: { totalCount: 0, totalAmount: 0 },
      totalFailed: { totalCount: 0, totalAmount: 0 },
      commissionOverview: { totalDays: 0, totalCommission: 0 },
    };

    if (result.length) {
      const resObj = result[0];
      stats.totalSuccess = resObj.totalSuccess[0] || stats.totalSuccess;
      stats.totalPending = resObj.totalPending[0] || stats.totalPending;
      stats.totalFailed = resObj.totalFailed[0] || stats.totalFailed;
      stats.commissionOverview =
        resObj.commissionOverview[0] || stats.commissionOverview;
    }

    // Respond with proper numbers formatted
    return res.status(200).json({
      success: true,
      message: "Bbps Stats fetched successfully",
      data: {
        totalSuccess: {
          count: stats.totalSuccess.totalCount,
          amount: paiseToRupee(stats.totalSuccess.totalAmount),
        },
        totalPending: {
          count: stats.totalPending.totalCount,
          amount: paiseToRupee(stats.totalPending.totalAmount),
        },
        totalFailed: {
          count: stats.totalFailed.totalCount,
          amount: paiseToRupee(stats.totalFailed.totalAmount),
        },
        commissionOverview: {
          totalDays: stats.commissionOverview.totalDays,
          totalCommission: paiseToRupee(
            stats.commissionOverview.totalCommission,
          ),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getBbpsReportById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Bbps ID Required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bbps report ID",
      });
    }

    const [report] = await BbpsReport.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          fullName: { $concat: ["$user.firstName", " ", "$user.lastName"] },
          userName: "$user.userName",
        },
      },
      {
        $lookup: {
          from: "transactions",
          let: {
            refId: "$referenceId",
            uid: "$userId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$referenceId", "$$refId"],
                    },
                    {
                      $eq: ["$userId", "$$uid"],
                    },
                  ],
                },
              },
            },

            {
              $project: {
                _id: 0,
                status: 1,
                meta: 1,
                serviceType: 1,
              },
            },
          ],
          as: "transaction",
        },
      },

      {
        $unwind: {
          path: "$transaction",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          user: 0,
        },
      },
    ]);

    if (!report) {
      return res.status(200).json({
        success: true,
        message: "Bbps report not found",
        data: {},
      });
    }

    const request = report?.transaction?.meta?.request || {};
    const response = report?.transaction?.meta?.response || {};

    const { amount, ...formattedRequest } = request;
    const { data, ...formattedResponse } = response;

    const formattedData = report
      ? {
          ...report,
          amount: paiseToRupee(report?.amount),
          commission: paiseToRupee(report?.commission),
          tds: paiseToRupee(report?.tds),
          netCommission: paiseToRupee(report?.netCommission),
          request: formattedRequest,
          response: formattedResponse,
          transaction: undefined,
        }
      : null;

    return res.status(200).json({
      success: true,
      message: "Bbps report fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getBbpsReport = async (req, res, next) => {
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
    const filter = {};
    const now = new Date();
    let fromDate, toDate;

    const allowedStatus = ["success", "failed", "pending"];
    const allowedRanges = ["today", "yesterday", "last7days", "thismonth"];

    if (isNaN(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a valid number greater than 0",
      });
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100",
      });
    }

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

    const isNumber = /^\d+(\.\d+)?$/.test(search);
    const escapeRegex = (text) => {
      return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    const safeSearch = escapeRegex(search);

    const bbpsReport = await BbpsReport.aggregate([
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
        $addFields: {
          fullName: { $concat: ["$user.firstName", " ", "$user.lastName"] },
          userName: "$user.userName",
        },
      },
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { category: { $regex: safeSearch, $options: "i" } },
                  { referenceId: { $regex: safeSearch, $options: "i" } },
                  { description: { $regex: safeSearch, $options: "i" } },
                  { mobileNumber: { $regex: safeSearch, $options: "i" } },
                  { fullName: { $regex: safeSearch, $options: "i" } },
                  { userName: { $regex: safeSearch, $options: "i" } },
                  ...(isNumber ? [{ amount: Number(safeSearch) }] : []),
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
                user: 0,
              },
            },
          ],
          totalCount: [{ $count: "total" }],
        },
      },
    ]);

    const data = bbpsReport[0]?.data || [];
    const total = bbpsReport[0]?.totalCount[0]?.total || 0;

    const formattedData = data.map((item) => ({
      ...item,
      amount: paiseToRupee(item?.amount),
      commission: paiseToRupee(item?.commission),
      tds: paiseToRupee(item?.tds),
      netCommission: paiseToRupee(item?.netCommission),
    }));

    return res.status(200).json({
      success: true,
      message: "Bbps Report fetched successfully",
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

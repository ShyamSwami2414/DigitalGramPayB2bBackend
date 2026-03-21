const mongoose = require("mongoose");
const Service = require("../../models/serviceModel");
const User = require("../../models/userModel");
const RechargeReport = require("../../models/rechargeReportModel");
const { paiseToRupee } = require("../../utils/money");

exports.getRechargeStats = async (req, res, next) => {
  try {
    const result = await RechargeReport.aggregate([
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
      message: "Recharge stats fetched successfully",
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

exports.getRechargeReportById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Report ID Required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const [report] = await RechargeReport.aggregate([
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
        $project: {
          user: 0,
        },
      },
    ]);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Recharge report not found",
      });
    }

    const formattedData = report
      ? {
          ...report,
          amount: paiseToRupee(report?.amount),
          commission: paiseToRupee(report?.commission),
          tds: paiseToRupee(report?.tds),
          netCommission: paiseToRupee(report?.netCommission),
        }
      : null;

    return res.status(200).json({
      success: true,
      message: "Recharge report fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getRechargeReport = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      from = "",
      to = "",
      userId = "",
    } = req.query;
    page = Number(page);
    limit = Number(limit);
    search = search?.trim();
    userId = userId?.trim();
    const skip = (page - 1) * limit;

    console.log(req.query, "query");

    const filter = {};

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

    if (from && isNaN(Date.parse(from))) {
      return res.status(400).json({
        success: false,
        message: "Invalid 'from' date",
      });
    }

    if (to && isNaN(Date.parse(to))) {
      return res.status(400).json({
        success: false,
        message: "Invalid 'to' date",
      });
    }

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId))
        return res
          .status(400)
          .json({ success: false, message: "Invalid userId" });

      const user = await User.findOne({
        _id: userId,
        isActive: true,
        isDeleted: false,
      });
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      filter.userId = user._id;
    }

    // Filter by date range
    if (from || to) {
      filter.createdAt = {};

      if (from) {
        filter.createdAt.$gte = new Date(from);
      }

      if (to) {
        filter.createdAt.$lte = new Date(to);
      }
    }

    if (search) {
      filter.$or = [
        {
          amount: {
            $regex: search,
            $options: "i",
          },
        },

        {
          mobileNumber: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const rechargeReport = await RechargeReport.aggregate([
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
      {
        $project: {
          user: 0,
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

    const total = await RechargeReport.countDocuments(filter);

    const formattedData = rechargeReport.map((item) => ({
      ...item,
      amount: paiseToRupee(item?.amount),
      commission: paiseToRupee(item?.commission),
      tds: paiseToRupee(item?.tds),
      netCommission: paiseToRupee(item?.netCommission),
    }));

    return res.status(200).json({
      success: true,
      message: "Recharge Report fetched successfully",
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

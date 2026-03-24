const RechargeReport = require("../../models/rechargeReportModel");
const mongoose = require("mongoose");
const User = require("../../models/userModel");
const { paiseToRupee } = require("../../utils/money");

//last 5 my recharge history
const getMyLastRechargeHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const data = await RechargeReport.find({
      userId,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const formattedData = data.map((item) => ({
      ...item,
      amount: paiseToRupee(item.amount),
      commission: paiseToRupee(item.commission),
      tds: paiseToRupee(item.tds),
      netCommission: paiseToRupee(item.netCommission),
    }));

    return res.status(200).json({
      success: true,
      message: "Last recharge history fetched",
      formattedData,
    });
  } catch (error) {
    next(error);
  }
};

const getRechargeStats = async (req, res, next) => {
  try {
    let { user = "", from = "", to = "" } = req.query;
    console.log(req.query);
    user = user?.trim();
    from = from?.trim();
    to = to?.trim();

    const filter = {};

    if (user) {
      if (!mongoose.Types.ObjectId.isValid(user)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user ID" });
      }

      const userExist = await User.findOne({ _id: user });

      if (!userExist) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      filter.userId = new mongoose.Types.ObjectId(user);
    }

    if (from || to) {
      filter.createdAt = {};

      if (from) {
        filter.createdAt.$gte = new Date(from);
      }

      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    const [result] = await RechargeReport.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,

          // totals
          totalCount: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          totalCommission: { $sum: "$netCommission" },

          // SUCCESS
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

          // PENDING
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

          // FAILED
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
        },
      },
      {
        $project: {
          _id: 0,

          total: {
            count: "$totalCount",
            amount: "$totalAmount",
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
        },
      },
    ]);

    const formattedData = result
      ? {
          ...result,
          total: {
            count: result?.total?.count,
            amount: paiseToRupee(result?.total?.amount),
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
        }
      : null;

    return res
      .status(200)
      .json({ success: true, message: "Report Stats", data: formattedData });
  } catch (error) {
    next(error);
  }
};

const getCompleteRechargeReport = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      fromDate = "",
      toDate = "",
      status = "",
      operator = "",
      type = "",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    search = search.trim();
    status = status.trim().toUpperCase();
    operator = operator.trim().toUpperCase();
    type = type.trim().toLowerCase();
    fromDate = fromDate.trim();
    toDate = toDate.trim();

    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    const rechargeReport = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },

      //downline
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

      { $project: { allUsers: { $concatArrays: [["$$ROOT"], "$downline"] } } },

      { $unwind: "$allUsers" },

      {
        $lookup: {
          from: "rechargereports",
          localField: "allUsers._id",
          foreignField: "userId",
          as: "recharges",
        },
      },

      { $unwind: "$recharges" },

      {
        $match: {
          ...(status && { "recharges.status": status }),
          ...(operator && {
            "recharges.operatorName": { $regex: operator, $options: "i" },
          }),
          ...(type && { "recharges.type": type }),
          ...(search && {
            $or: [
              { "recharges.mobileNumber": { $regex: search, $options: "i" } },
              { "recharges.referenceId": { $regex: search, $options: "i" } },
            ],
          }),
          ...(fromDate &&
            toDate && {
              "recharges.createdAt": {
                $gte: new Date(fromDate),
                $lte: new Date(toDate),
              },
            }),
        },
      },

      // Project required fields
      {
        $project: {
          _id: "$recharges._id",
          mobileNumber: "$recharges.mobileNumber",
          operatorId: "$recharges.operatorId",
          operatorName: "$recharges.operatorName",
          amount: "$recharges.amount",
          type: "$recharges.type",
          status: "$recharges.status",
          commission: "$recharges.commission",
          tds: "$recharges.tds",
          netCommission: "$recharges.netCommission",
          referenceId: "$recharges.referenceId",
          isRefunded: "$recharges.isRefunded",
          description: "$recharges.description",
          createdAt: "$recharges.createdAt",
          updatedAt: "$recharges.updatedAt",
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

    const formattedData = rechargeReport.map((item) => ({
      ...item,
      amount: paiseToRupee(item.amount),
      commission: paiseToRupee(item.commission),
      tds: paiseToRupee(item.tds),
      netCommission: paiseToRupee(item.netCommission),
    }));

    return res.status(200).json({
      success: true,
      message: "Recharge report fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyLastRechargeHistory,
  getRechargeStats,
  getCompleteRechargeReport,
};

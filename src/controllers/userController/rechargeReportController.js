const RechargeReport = require("../../models/rechargeReportModel");
const mongoose = require("mongoose");
const User = require("../../models/userModel");

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

    return res.status(200).json({
      success: true,
      message: "Last recharge history fetched",
      data,
    });
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

    return res.status(200).json({
      success: true,
      message: "Recharge report fetched successfully",
      data: rechargeReport,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyLastRechargeHistory, getCompleteRechargeReport };

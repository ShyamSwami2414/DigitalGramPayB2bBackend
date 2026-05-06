const mongoose = require("mongoose");
const User = require("../../models/userModel");
const BbpsReport = require("../../models/bbpsReportModel");
const { paiseToRupee } = require("../../utils/money");

//last 5 my bbps history
const getMyLastBillPaymentHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const data = await BbpsReport.find({
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
      message: "Bbps history fetched 5 transaction",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

const getBillPaymentStats = async (req, res, next) => {
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
        return res.status(400).json({
          success: false,
          message: "Invalid user ID",
        });
      }

      const userObjectId = new mongoose.Types.ObjectId(user);
      const currentUserId = new mongoose.Types.ObjectId(req.user.id);

      const userExist = await User.findById(userObjectId).lean();

      if (!userExist) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // ✅ ONLY check if NOT self
      if (!userObjectId.equals(currentUserId)) {
        const downlineData = await User.aggregate([
          { $match: { _id: currentUserId } },
          {
            $graphLookup: {
              from: "users",
              startWith: "$_id",
              connectFromField: "_id",
              connectToField: "parentUserId",
              as: "downline",
              maxDepth: 10,
            },
          },
          {
            $project: {
              allUserIds: {
                $concatArrays: [["$_id"], "$downline._id"],
              },
            },
          },
        ]);

        const allUserIds = downlineData?.[0]?.allUserIds || [];

        const isAllowed = allUserIds.some((id) => id.equals(userObjectId));

        if (!isAllowed) {
          return res.status(403).json({
            success: false,
            message: "Not allowed to access this user",
          });
        }
      }
    }

    // if (user) {
    //   if (!mongoose.Types.ObjectId.isValid(user)) {
    //     return res
    //       .status(400)
    //       .json({ success: false, message: "Invalid user ID" });
    //   }

    //   const userExist = await User.findOne({ _id: user }).lean();

    //   if (!userExist) {
    //     return res
    //       .status(404)
    //       .json({ success: false, message: "User not found" });
    //   }

    //   if (
    //     userExist._id.toString() !== req.user.id.toString() && // not self
    //     userExist.parentUserId?.toString() !== req.user.id.toString() // not child
    //   ) {
    //     return res.status(403).json({
    //       success: false,
    //       message: "Not allowed to access this user",
    //     });
    //   }
    // }

    const isSpecificUser = user && mongoose.Types.ObjectId.isValid(user);
    const targetUserId = isSpecificUser ? user : req.user.id;

    let pipeline = [];

    if (isSpecificUser) {
      pipeline.push(
        {
          $match: {
            userId: new mongoose.Types.ObjectId(targetUserId),
          },
        },

        ...(filter.status ? [{ $match: { status: filter.status } }] : []),
        ...(filter.createdAt
          ? [{ $match: { createdAt: filter.createdAt } }]
          : []),

        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            totalCommission: { $sum: "$netCommission" },

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
      );
    } else {
      pipeline.push(
        {
          $match: {
            _id: new mongoose.Types.ObjectId(targetUserId),
          },
        },
        {
          $graphLookup: {
            from: "users",
            startWith: "$_id",
            connectFromField: "_id",
            connectToField: "parentUserId",
            as: "downline",
            maxDepth: 4,
          },
        },
        {
          $project: {
            allUserIds: {
              $concatArrays: [["$_id"], "$downline._id"],
            },
          },
        },
        {
          $lookup: {
            from: "bbpsreports",
            let: { userIds: "$allUserIds" },
            pipeline: [
              {
                $match: {
                  $expr: { $in: ["$userId", "$$userIds"] },
                },
              },

              ...(filter.status ? [{ $match: { status: filter.status } }] : []),
              ...(filter.createdAt
                ? [{ $match: { createdAt: filter.createdAt } }]
                : []),

              {
                $group: {
                  _id: null,
                  totalCount: { $sum: 1 },
                  totalAmount: { $sum: "$amount" },
                  totalCommission: { $sum: "$netCommission" },

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
                },
              },
            ],
            as: "stats",
          },
        },
      );
    }

    const Model = isSpecificUser ? BbpsReport : User;
    const [result] = await Model.aggregate(pipeline);

    const statsData = isSpecificUser ? result : result?.stats?.[0];

    //aggregation start ---------------------------------

    const defaultStats = {
      total: { count: 0, amount: 0, commission: 0 },
      success: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      failed: { count: 0, amount: 0 },
    };

    const formattedData = statsData
      ? {
          total: {
            count: statsData.totalCount ?? statsData.total?.count ?? 0,
            amount: paiseToRupee(
              statsData.totalAmount ?? statsData.total?.amount ?? 0,
            ),
            commission: paiseToRupee(
              statsData.totalCommission ?? statsData.total?.commission ?? 0,
            ),
          },
          success: {
            count: statsData.successCount ?? statsData.success?.count ?? 0,
            amount: paiseToRupee(
              statsData.successAmount ?? statsData.success?.amount ?? 0,
            ),
          },
          pending: {
            count: statsData.pendingCount ?? statsData.pending?.count ?? 0,
            amount: paiseToRupee(
              statsData.pendingAmount ?? statsData.pending?.amount ?? 0,
            ),
          },
          failed: {
            count: statsData.failedCount ?? statsData.failed?.count ?? 0,
            amount: paiseToRupee(
              statsData.failedAmount ?? statsData.failed?.amount ?? 0,
            ),
          },
        }
      : defaultStats;

    return res
      .status(200)
      .json({ success: true, message: "Report Stats", data: formattedData });
  } catch (error) {
    next(error);
  }
};

const getCompleteBillPaymentReport = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      category = "",
      type = "",
      user = "",
      status = "",
      from = "",
      to = "",
      range = "",
    } = req.query;

    console.log(req.query, "query");

    page = Number(page);
    limit = Number(limit);
    search = search?.trim();
    category = category?.trim().toUpperCase();
    type = type?.trim().toLowerCase();
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
    const userId = req.user.id;
    const skip = (page - 1) * limit;

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

    // if (user) {
    //   if (!mongoose.Types.ObjectId.isValid(user)) {
    //     return res
    //       .status(400)
    //       .json({ success: false, message: "Invalid user ID" });
    //   }

    //   const userExist = await User.findOne({ _id: user }).lean();

    //   if (!userExist) {
    //     return res
    //       .status(404)
    //       .json({ success: false, message: "User not found" });
    //   }

    //   if (
    //     userExist._id.toString() !== req.user.id.toString() && // not self
    //     userExist.parentUserId?.toString() !== req.user.id.toString() // not child
    //   ) {
    //     return res.status(403).json({
    //       success: false,
    //       message: "Not allowed to access this user",
    //     });
    //   }
    // }

    if (user) {
      if (!mongoose.Types.ObjectId.isValid(user)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID",
        });
      }

      const userObjectId = new mongoose.Types.ObjectId(user);
      const currentUserId = new mongoose.Types.ObjectId(req.user.id);

      const userExist = await User.findById(userObjectId).lean();

      if (!userExist) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      //  ONLY check if NOT self
      if (!userObjectId.equals(currentUserId)) {
        const downlineData = await User.aggregate([
          { $match: { _id: currentUserId } },
          {
            $graphLookup: {
              from: "users",
              startWith: "$_id",
              connectFromField: "_id",
              connectToField: "parentUserId",
              as: "downline",
              maxDepth: 10,
            },
          },
          {
            $project: {
              allUserIds: {
                $concatArrays: [["$_id"], "$downline._id"],
              },
            },
          },
        ]);

        const allUserIds = downlineData?.[0]?.allUserIds || [];

        const isAllowed = allUserIds.some((id) => id.equals(userObjectId));

        if (!isAllowed) {
          return res.status(403).json({
            success: false,
            message: "Not allowed to access this user",
          });
        }
      }
    }

    const bbpsReport = await User.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(userId) },
      },

      //  Get downline
      {
        $graphLookup: {
          from: "users",
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "parentUserId",
          as: "downline",
          maxDepth: 10,
        },
      },

      //  Collect all user IDs
      {
        $project: {
          allUserIds: user
            ? [new mongoose.Types.ObjectId(user)] //  only selected user
            : { $concatArrays: [["$_id"], "$downline._id"] },
        },
      },

      //  Lookup bbps reports
      {
        $lookup: {
          from: "bbpsreports",
          let: { userIds: "$allUserIds" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$userId", "$$userIds"],
                },
              },
            },

            ...(status ? [{ $match: { status: status.toUpperCase() } }] : []),

            ...(type ? [{ $match: { type } }] : []),

            ...(search
              ? [
                  {
                    $match: {
                      $or: [
                        { mobileNumber: { $regex: search, $options: "i" } },
                        { referenceId: { $regex: search, $options: "i" } },
                      ],
                    },
                  },
                ]
              : []),

            ...(filter.createdAt && Object.keys(filter.createdAt).length
              ? [{ $match: { createdAt: filter.createdAt } }]
              : []),
          ],
          as: "billPayments",
        },
      },

      //  IMPORTANT: unwind BEFORE pagination
      {
        $unwind: {
          path: "$billPayments",
          preserveNullAndEmptyArrays: false,
        },
      },

      //  Replace root (flatten)
      {
        $replaceRoot: { newRoot: "$billPayments" },
      },

      //  Apply user filter (IMPORTANT FIX)
      ...(user
        ? [
            {
              $match: {
                userId: new mongoose.Types.ObjectId(user),
              },
            },
          ]
        : []),

      //  SORT globally
      { $sort: { createdAt: -1 } },

      //  FACET (pagination + total in single query)
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },

            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: "$user" },

            {
              $project: {
                amount: 1,
                type: 1,
                status: 1,
                commission: 1,
                tds: 1,
                netCommission: 1,
                referenceId: 1,
                isRefunded: 1,
                description: 1,
                createdAt: 1,
                userName: "$user.userName",
                fullName: {
                  $concat: ["$user.firstName", " ", "$user.lastName"],
                },

                // user: {
                //   _id: "$user._id",
                //   firstName: "$user.firstName",
                //   lastName: "$user.lastName",
                //   userName: "$user.userName",
                //   level: "$user.level",
                // },
              },
            },
          ],

          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const data = bbpsReport[0]?.data || [];
    const total = bbpsReport[0]?.totalCount[0]?.count || 0;

    const formattedData = data.map((item) => ({
      ...item,
      amount: paiseToRupee(item.amount),
      commission: paiseToRupee(item.commission),
      tds: paiseToRupee(item.tds),
      netCommission: paiseToRupee(item.netCommission),
    }));

    return res.status(200).json({
      success: true,
      message: "Bbps report fetched successfully",

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

const getBbpsReportById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Report Id required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Report Id",
      });
    }

    const [report] = await BbpsReport.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
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
        $lookup: {
          from: "providerlogs",
          localField: "referenceId",
          foreignField: "referenceId",
          as: "provider",
        },
      },
      {
        $unwind: {
          path: "$provider",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          fullName: { $concat: ["$user.firstName", " ", "$user.lastName"] },
          userName: "$user.userName",
          email: "$user.email",
          serviceName: "BBPS",
          providerTxnId: "$provider.providerTxnId",
          // requestBody: "$provider.request",
          // responseBody: "$provider.response",
        },
      },
      {
        $project: {
          user: 0,
          provider: 0,
          updatedAt: 0,
        },
      },
    ]);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Bbps Report not found",
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
      message: "Bbps report fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyLastBillPaymentHistory,
  getBillPaymentStats,
  getCompleteBillPaymentReport,
  getBbpsReportById,
};

// const getBbpsStats = async (req, res, next) => {
//   try {
//     let { user = "", from = "", to = "" } = req.query;
//     console.log(req.query);
//     user = user?.trim();
//     from = from?.trim();
//     to = to?.trim();

//     const filter = {};

//     if (user) {
//       if (!mongoose.Types.ObjectId.isValid(user)) {
//         return res
//           .status(400)
//           .json({ success: false, message: "Invalid user ID" });
//       }

//       const userExist = await User.findOne({ _id: user });

//       if (!userExist) {
//         return res
//           .status(404)
//           .json({ success: false, message: "User not found" });
//       }

//       filter.userId = new mongoose.Types.ObjectId(user);
//     }

//     if (from || to) {
//       filter.createdAt = {};

//       if (from) {
//         filter.createdAt.$gte = new Date(from);
//       }

//       if (to) {
//         const toDate = new Date(to);
//         toDate.setHours(23, 59, 59, 999);
//         filter.createdAt.$lte = toDate;
//       }
//     }

//     const [result] = await BbpsReport.aggregate([
//       { $match: filter },
//       {
//         $group: {
//           _id: null,

//           // totals
//           totalCount: { $sum: 1 },
//           totalAmount: { $sum: "$amount" },
//           totalCommission: { $sum: "$netCommission" },

//           // SUCCESS
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

//           // PENDING
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

//           // FAILED
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
//         },
//       },
//       {
//         $project: {
//           _id: 0,

//           total: {
//             count: "$totalCount",
//             amount: "$totalAmount",
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
//         },
//       },
//     ]);

//     const formattedData = result
//       ? {
//           ...result,
//           total: {
//             count: result?.total?.count,
//             amount: paiseToRupee(result?.total?.amount),
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
//         }
//       : null;

//     return res.status(200).json({
//       success: true,
//       message: "BBPS Report Stats",
//       data: formattedData,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

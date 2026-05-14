const DmtReport = require("../../models/dmtReportModel");
const mongoose = require("mongoose");
const User = require("../../models/userModel");
const { paiseToRupee } = require("../../utils/money");

//last 5 my dmt transaction history
const getMyLastDmtHistory = async (req, res, next) => {
  try {
    let { search = "" } = req.query;
    search = search?.trim();

    const userId = req.user.id;

    const result = await DmtReport.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
        },
      },
      ...(search
        ? [
            {
              $addFields: {
                amountStr: { $toString: "$amount" },
                commissionStr: { $toString: "$commission" },
                netCommissionStr: { $toString: "$netCommission" },
                tdsStr: { $toString: "$tds" },
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
                  { commissionStr: { $regex: search, $options: "i" } },
                  { netCommissionStr: { $regex: search, $options: "i" } },
                  { tdsStr: { $regex: search, $options: "i" } },
                  { operatorName: { $regex: search, $options: "i" } },
                  { mobileNumber: { $regex: search, $options: "i" } },
                  { status: { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      {
        $sort: { createdAt: -1 },
      },
      {
        $limit: 5,
      },
      {
        $project: {
          beneficiaryName: 1,
          beneficiaryIfsc: 1,
          beneficiaryAccount: 1,
          amount: 1,
          charge: 1,
          gst: 1,
          tds: 1,
          totalAmount: "$totalDebit",
          message: "$reason" || "$message",
          mobileNumber: 1,
          status: "$status",
          createdAt: 1,
          referenceId: 1,
          message: 1,
        },
      },
    ]);

    const formattedData = result.map((item) => ({
      ...item,
      amount: paiseToRupee(item?.amount),
      totalAmount: paiseToRupee(item?.totalAmount),
      charge: paiseToRupee(item?.charge),
      tds: paiseToRupee(item?.tds),
      gst: paiseToRupee(item?.gst),
    }));

    return res.status(200).json({
      success: true,
      message: "Last transaction history fetched",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

const getDmtStats = async (req, res, next) => {
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

    //  if (user) {
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
            totalCharges: { $sum: "$netCharges" },

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
              charges: "$totalDebit",
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
            from: "dmtreports",
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
                  totalCharges: { $sum: "$totalDebit" },

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

    const Model = isSpecificUser ? DmtReport : User;
    const [result] = await Model.aggregate(pipeline);

    const statsData = isSpecificUser ? result : result?.stats?.[0];

    //aggregation start ---------------------------------

    const defaultStats = {
      total: { count: 0, amount: 0, charges: 0 },
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
            charges: paiseToRupee(
              statsData.totalCharges ?? statsData.total?.charges ?? 0,
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

const getCompleteDmtReport = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      operator = "",
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
    operator = operator?.trim().toUpperCase();
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

    const dmtReport = await User.aggregate([
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

      //  Lookup recharge reports
      {
        $lookup: {
          from: "dmtreports",
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

            ...(operator
              ? [
                  {
                    $match: {
                      operatorName: { $regex: operator, $options: "i" },
                    },
                  },
                ]
              : []),

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
          as: "dmt",
        },
      },

      //  IMPORTANT: unwind BEFORE pagination
      {
        $unwind: {
          path: "$dmt",
          preserveNullAndEmptyArrays: false,
        },
      },

      //  Replace root (flatten)
      {
        $replaceRoot: { newRoot: "$dmt" },
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
                message: "$reason" || "$message",
                beneficiaryName: 1,
                beneficiaryIfsc: 1,
                beneficiaryAccount: 1,
                status: "$status",
                charge: 1,
                tds: 1,
                gst: 1,
                totalCharges: "$totalDebit",
                referenceId: 1,
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

    const data = dmtReport[0]?.data || [];
    const total = dmtReport[0]?.totalCount[0]?.count || 0;

    const formattedData = data.map((item) => ({
      ...item,
      amount: paiseToRupee(item.amount),
      charge: paiseToRupee(item.charge),
      tds: paiseToRupee(item.tds),
      gst: paiseToRupee(item.gst),
      totalAmount: paiseToRupee(item.totalCharges),
    }));

    return res.status(200).json({
      success: true,
      message: "Dmt reports fetched successfully",

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

const getDmtReportById = async (req, res, next) => {
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

    const [report] = await DmtReport.aggregate([
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
          phone: "$user.phone",
          serviceName: "DMT",
          providerTxnId: "$provider.providerTxnId",
          requestBody: "$provider.request",
          responseBody: "$provider.response",
        },
      },
      {
        $project: {
          amount: 1,
          message: "$reason" || "$message",
          beneficiaryName: 1,
          beneficiaryIfsc: 1,
          beneficiaryAccount: 1,
          status: "$status",
          charge: 1,
          tds: 1,
          gst: 1,
          totalCharges: "$totalDebit",
          referenceId: 1,
          createdAt: 1,
          userName: "$user.userName",
          message: 1,
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
    ]);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Dmt Report not found",
      });
    }

    const formattedData = report
      ? {
          ...report,
          amount: paiseToRupee(report?.amount),
          charge: paiseToRupee(report?.charge),
          tds: paiseToRupee(report?.tds),
          gst: paiseToRupee(report?.gst),
          totalAmount: paiseToRupee(report?.totalCharges),
        }
      : null;

    return res.status(200).json({
      success: true,
      message: "DMT report fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyLastDmtHistory,
  getDmtStats,
  getCompleteDmtReport,
  getDmtReportById,
};

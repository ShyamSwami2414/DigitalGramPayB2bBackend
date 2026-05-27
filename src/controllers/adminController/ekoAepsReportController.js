const EkoAepsReport = require("../../models/ekoAepsReportModel");
const mongoose = require("mongoose");
const User = require("../../models/userModel");
const { paiseToRupee } = require("../../utils/money");

const getAepsStats = async (req, res, next) => {
  try {
    let { user = "", status = "", from = "", to = "", range = "" } = req.query;

    console.log(req.query);

    user = user?.trim();
    status = typeof status === "string" ? status.trim().toLowerCase() : "";
    range = typeof range === "string" ? range.trim().toLowerCase() : "";
    from = typeof from === "string" ? from.trim() : "";
    to = typeof to === "string" ? to.trim() : "";

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

    let fromDate;
    let toDate;

    const allowedStatus = ["success", "failed", "pending"];
    const allowedRanges = ["today", "yesterday", "last7days", "thismonth"];

    // STATUS VALIDATION

    if (status && !allowedStatus.includes(status)) {
      const err = new Error("Invalid Status");
      err.statusCode = 400;
      throw err;
    }

    // RANGE VALIDATION

    if (range && !allowedRanges.includes(range)) {
      const err = new Error("Invalid Range");
      err.statusCode = 400;
      throw err;
    }

    // FUTURE DATE VALIDATION

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

    // STATUS FILTER

    if (status) {
      filter.txnStatus = status.toUpperCase();
    }

    // RANGE FILTER

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
      // MANUAL DATE VALIDATION

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

    // DATE FILTER

    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) {
        filter.createdAt.$gte = fromDate;
      }

      if (toDate) {
        filter.createdAt.$lte = toDate;
      }
    }

    // USER VALIDATION

    if (user) {
      if (!mongoose.Types.ObjectId.isValid(user)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID",
        });
      }

      const userExist = await User.findById(user).lean();

      if (!userExist) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
    }

    let result = null;

    // =====================================================
    // ADMIN ALL DATA
    // =====================================================

    if (!user) {
      const pipeline = [
        {
          $match: filter,
        },

        {
          $group: {
            _id: null,

            totalCount: {
              $sum: 1,
            },

            totalAmount: {
              $sum: "$amount",
            },

            totalCommission: {
              $sum: "$netCommission",
            },

            successCount: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$txnStatus", "SUCCESS"],
                  },
                  1,
                  0,
                ],
              },
            },

            successAmount: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$txnStatus", "SUCCESS"],
                  },
                  "$amount",
                  0,
                ],
              },
            },

            pendingCount: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$txnStatus", "PENDING"],
                  },
                  1,
                  0,
                ],
              },
            },

            pendingAmount: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$txnStatus", "PENDING"],
                  },
                  "$amount",
                  0,
                ],
              },
            },

            failedCount: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$txnStatus", "FAILED"],
                  },
                  1,
                  0,
                ],
              },
            },

            failedAmount: {
              $sum: {
                $cond: [
                  {
                    $eq: ["$txnStatus", "FAILED"],
                  },
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
      ];

      [result] = await EkoAepsReport.aggregate(pipeline);
    }

    // =====================================================
    // SELECTED USER + DOWNLINE
    // =====================================================
    else {
      const pipeline = [
        {
          $match: {
            _id: new mongoose.Types.ObjectId(user),
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
            from: "ekoaepsreports",

            let: {
              userIds: "$allUserIds",
            },

            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$userId", "$$userIds"],
                  },
                },
              },

              ...(filter.txnStatus
                ? [
                    {
                      $match: {
                        txnStatus: filter.txnStatus,
                      },
                    },
                  ]
                : []),

              ...(filter.createdAt
                ? [
                    {
                      $match: {
                        createdAt: filter.createdAt,
                      },
                    },
                  ]
                : []),

              {
                $group: {
                  _id: null,

                  totalCount: {
                    $sum: 1,
                  },

                  totalAmount: {
                    $sum: "$amount",
                  },

                  totalCommission: {
                    $sum: "$netCommission",
                  },

                  successCount: {
                    $sum: {
                      $cond: [
                        {
                          $eq: ["$txnStatus", "SUCCESS"],
                        },
                        1,
                        0,
                      ],
                    },
                  },

                  successAmount: {
                    $sum: {
                      $cond: [
                        {
                          $eq: ["$txnStatus", "SUCCESS"],
                        },
                        "$amount",
                        0,
                      ],
                    },
                  },

                  pendingCount: {
                    $sum: {
                      $cond: [
                        {
                          $eq: ["$txnStatus", "PENDING"],
                        },
                        1,
                        0,
                      ],
                    },
                  },

                  pendingAmount: {
                    $sum: {
                      $cond: [
                        {
                          $eq: ["$txnStatus", "PENDING"],
                        },
                        "$amount",
                        0,
                      ],
                    },
                  },

                  failedCount: {
                    $sum: {
                      $cond: [
                        {
                          $eq: ["$txnStatus", "FAILED"],
                        },
                        1,
                        0,
                      ],
                    },
                  },

                  failedAmount: {
                    $sum: {
                      $cond: [
                        {
                          $eq: ["$txnStatus", "FAILED"],
                        },
                        "$amount",
                        0,
                      ],
                    },
                  },
                },
              },
            ],

            as: "stats",
          },
        },
      ];

      const [userResult] = await User.aggregate(pipeline);

      result = userResult?.stats?.[0];
    }

    // =====================================================
    // DEFAULT STATS
    // =====================================================

    const defaultStats = {
      totalSuccess: {
        count: 0,
        amount: 0,
      },

      totalPending: {
        count: 0,
        amount: 0,
      },

      totalFailed: {
        count: 0,
        amount: 0,
      },

      total: {
        totalCount: 0,
        totalAmount: 0,
      },
    };

    // =====================================================
    // FINAL RESPONSE FORMAT
    // =====================================================

    const formattedData = result
      ? {
          totalSuccess: {
            count: result?.successCount || 0,
            amount: paiseToRupee(result?.successAmount || 0),
          },

          totalPending: {
            count: result?.pendingCount || 0,
            amount: paiseToRupee(result?.pendingAmount || 0),
          },

          totalFailed: {
            count: result?.failedCount || 0,
            amount: paiseToRupee(result?.failedAmount || 0),
          },

          total: {
            count: result?.totalCount || 0,
            amount: paiseToRupee(result?.totalAmount || 0),
          },
        }
      : defaultStats;

    return res.status(200).json({
      success: true,
      message: "AEPS stats fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

const getCompleteAepsReport = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      operator = "",
      type = "",
      userId = "",
      status = "",
      from = "",
      to = "",
      range = "",
    } = req.query;

    console.log(req.query, "query");

    // =====================================================
    // NORMALIZATION
    // =====================================================

    page = Number(page);
    limit = Number(limit);

    search = search?.trim();

    operator = typeof operator === "string" ? operator.trim() : "";
    type = typeof type === "string" ? type.trim().toLowerCase() : "";
    status = typeof status === "string" ? status.trim().toLowerCase() : "";
    range = typeof range === "string" ? range.trim().toLowerCase() : "";
    from = typeof from === "string" ? from.trim() : "";
    to = typeof to === "string" ? to.trim() : "";

    // =====================================================
    // CLEAN INVALID VALUES
    // =====================================================

    if (!from || from === "null" || from === "undefined") {
      from = undefined;
    }

    if (!to || to === "null" || to === "undefined") {
      to = undefined;
    }

    if (!range || range === "null" || range === "undefined") {
      range = undefined;
    }

    // =====================================================
    // PAGINATION
    // =====================================================

    const skip = (page - 1) * limit;

    // =====================================================
    // FILTERS
    // =====================================================

    const filter = {};

    const now = new Date();

    let fromDate;
    let toDate;

    const allowedStatus = ["success", "failed", "pending"];

    const allowedRanges = ["today", "yesterday", "last7days", "thismonth"];

    // =====================================================
    // STATUS VALIDATION
    // =====================================================

    if (status && !allowedStatus.includes(status)) {
      const err = new Error("Invalid Status");

      err.statusCode = 400;

      throw err;
    }

    // =====================================================
    // RANGE VALIDATION
    // =====================================================

    if (range && !allowedRanges.includes(range)) {
      const err = new Error("Invalid Range");

      err.statusCode = 400;

      throw err;
    }

    // =====================================================
    // FUTURE DATE VALIDATION
    // =====================================================

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

    // =====================================================
    // STATUS FILTER
    // =====================================================

    if (status) {
      filter.txnStatus = status?.toUpperCase();
    }

    // =====================================================
    // RANGE FILTER
    // =====================================================

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
    }

    // =====================================================
    // MANUAL DATE FILTER
    // =====================================================
    else {
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

    // =====================================================
    // APPLY DATE FILTER
    // =====================================================

    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) {
        filter.createdAt.$gte = fromDate;
      }

      if (toDate) {
        filter.createdAt.$lte = toDate;
      }
    }

    // =====================================================
    // USER VALIDATION
    // =====================================================

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID",
        });
      }

      const userExist = await User.findById(userId).lean();

      if (!userExist) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
    }

    // =====================================================
    // REPORT MATCH FILTER
    // =====================================================

    const reportMatch = {};

    if (status) {
      reportMatch.txnStatus = status?.toUpperCase();
    }

    if (filter.createdAt && Object.keys(filter.createdAt).length) {
      reportMatch.createdAt = filter.createdAt;
    }

    if (operator) {
      reportMatch.operatorName = {
        $regex: operator,
        $options: "i",
      };
    }

    if (type) {
      reportMatch.type = type;
    }

    // if (search) {
    //   reportMatch.$or = [
    //     {
    //       mobileNumber: {
    //         $regex: search,
    //         $options: "i",
    //       },
    //     },

    //     {
    //       referenceId: {
    //         $regex: search,
    //         $options: "i",
    //       },
    //     },
    //   ];
    // }

    // =====================================================
    // USER + DOWNLINE FILTER
    // =====================================================

    if (userId) {
      const userTree = await User.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(userId),
          },
        },

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

      const allUserIds = userTree?.[0]?.allUserIds || [];

      reportMatch.userId = {
        $in: allUserIds,
      };
    }

    // =====================================================
    // MAIN AGGREGATION
    // =====================================================
    const isNumber = /^\d+(\.\d+)?$/.test(search);
    const aepsReport = await EkoAepsReport.aggregate([
      {
        $match: reportMatch,
      },

      // USER LOOKUP BEFORE SEARCH
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
          from: "tdsledgers",
          localField: "referenceId",
          foreignField: "referenceId",
          as: "tdsData",
        },
      },

      {
        $unwind: {
          path: "$tdsData",
          preserveNullAndEmptyArrays: true,
        },
      },

      // SEARCH BEFORE FACET
      ...(search
        ? [
            {
              $match: {
                $or: [
                  {
                    mobileNumber: {
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

                  {
                    type: {
                      $regex: search,
                      $options: "i",
                    },
                  },

                  {
                    operatorName: {
                      $regex: search,
                      $options: "i",
                    },
                  },
                  {
                    serviceType: {
                      $regex: search,
                      $options: "i",
                    },
                  },

                  {
                    txnStatus: {
                      $regex: search,
                      $options: "i",
                    },
                  },

                  {
                    "user.userName": {
                      $regex: search,
                      $options: "i",
                    },
                  },

                  {
                    $expr: {
                      $regexMatch: {
                        input: {
                          $concat: ["$user.firstName", " ", "$user.lastName"],
                        },
                        regex: search,
                        options: "i",
                      },
                    },
                  },

                  ...(isNumber ? [{ amount: Number(search) }] : []),
                ],
              },
            },
          ]
        : []),

      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $facet: {
          data: [
            {
              $skip: skip,
            },

            {
              $limit: limit,
            },

            {
              $project: {
                amount: 1,
                accountBalance: 1,
                miniStatement: 1,
                serviceType: 1,
                type: 1,
                message: "$reason",
                mobileNumber: 1,
                status: "$txnStatus",
                commission: "$tdsData.commissionAmount",
                tds: "$tdsData.tdsAmount",
                netCommission: "$tdsData.netCommission",
                referenceId: 1,
                isRefunded: 1,
                description: 1,
                createdAt: 1,

                userName: "$user.userName",

                fullName: {
                  $concat: ["$user.firstName", " ", "$user.lastName"],
                },
              },
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
    // =====================================================
    // RESPONSE DATA
    // =====================================================

    const data = aepsReport?.[0]?.data || [];
    const total = aepsReport?.[0]?.totalCount?.[0]?.count || 0;

    // =====================================================
    // FORMAT DATA
    // =====================================================

    const formattedData = data.map((item) => ({
      ...item,

      amount: paiseToRupee(item?.amount || 0),
      commission: paiseToRupee(item?.commission || 0),
      tds: paiseToRupee(item?.tds || 0),
      netCommission: paiseToRupee(item?.netCommission || 0),
    }));

    // =====================================================
    // FINAL RESPONSE
    // =====================================================

    return res.status(200).json({
      success: true,
      message: "Aeps reports fetched successfully",
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

const getAepsReportById = async (req, res, next) => {
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

    const [report] = await EkoAepsReport.aggregate([
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
          from: "tdsledgers",
          localField: "referenceId",
          foreignField: "referenceId",
          as: "tdsData",
        },
      },
      {
        $unwind: {
          path: "$tdsData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          fullName: { $concat: ["$user.firstName", " ", "$user.lastName"] },
          commission: "$tdsData.commissionAmount",
          tds: "$tdsData.tdsAmount",
          netCommission: "$tdsData.netCommission",
          userName: "$user.userName",
          email: "$user.email",
          phone: "$user.phone",
          serviceName: "AEPS",
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
          tdsData: 0,
          user: 0,
          outletId: 0,
          updatedAt: 0,
          rawResponse: 0,
        },
      },
    ]);

    if (!report) {
      return res.status(200).json({
        success: true,
        message: "Aeps Report not found",
        data: {},
      });
    }

    const request = report?.transaction?.meta?.request || {};
    const response = report?.transaction?.meta?.response || {};

    const {
      userId,
      amount,
      bankProfileId,
      address,
      latitude,
      longitude,
      ...formattedRequest
    } = request;

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
      message: "Aeps report fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAepsStats,
  getCompleteAepsReport,
  getAepsReportById,
};

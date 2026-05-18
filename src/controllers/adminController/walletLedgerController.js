const WalletLedger = require("../../models/walletLedgerModel");
const mongoose = require("mongoose");
const User = require("../../models/userModel");
const { paiseToRupee } = require("../../utils/money");

exports.aepsToEwalletHistory = async (req, res, next) => {
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
    page = Number(page);
    limit = Number(limit);
    search = search?.trim();

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

    const filter = {
      wallet: "aeps",
      type: "debit",
    };

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
      filter.status = status?.toUpperCase();
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

      filter.userId = new mongoose.Types.ObjectId(userId);
    }

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

    const walletTransferHistory = await WalletLedger.aggregate([
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
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      ...(search
        ? [
            {
              $match: {
                $or: [
                  {
                    referenceId: {
                      $regex: search,
                      $options: "i",
                    },
                  },

                  {
                    wallet: {
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
                    description: {
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
                userId: 1,

                fullName: {
                  $concat: ["$user.firstName", " ", "$user.lastName"],
                },

                userName: "$user.userName",

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
          ],

          totalCount: [
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    const data = walletTransferHistory?.[0]?.data || [];

    const total = walletTransferHistory?.[0]?.totalCount?.[0]?.count || 0;

    const formattedData = data.map((item) => ({
      ...item,
      amount: paiseToRupee(item?.amount),
      openingBalance: paiseToRupee(item?.openingBalance),
      closingBalance: paiseToRupee(item?.closingBalance),
    }));

    return res.status(200).json({
      success: true,
      message: "Wallet transfer history fetched successfully",
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

exports.getAllLedgetEntryList = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      from = "",
      to = "",
      userId = "",
      referenceId = "",
    } = req.query;

    page = Number(page);
    limit = Number(limit);
    search = search?.trim();

    const skip = (page - 1) * limit;

    const filter = {};

    // ======================================================
    // VALIDATIONS
    // ======================================================

    if (isNaN(page) || page < 1) {
      return res.status(400).json({ success: false, message: "Invalid page" });
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ success: false, message: "Invalid limit" });
    }

    if (referenceId) {
      filter.referenceId = referenceId.trim();
    }

    // ======================================================
    // USER FILTER
    // ======================================================

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid userId" });
      }

      const user = await User.findById(userId).lean();

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    // ======================================================
    // DATE FILTER
    // ======================================================

    if (from || to) {
      filter.createdAt = {};

      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);

        filter.createdAt.$gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);

        filter.createdAt.$lte = toDate;
      }
    }

    // ======================================================
    // SAFE SEARCH
    // ======================================================

    const escapeRegex = (text) => {
      return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    const safeSearch = escapeRegex(search);

    if (search) {
      filter.$or = [
        {
          referenceId: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          description: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    // ======================================================
    // BASE PIPELINE
    // ======================================================

    const basePipeline = [
      {
        $match: filter,
      },

      // ======================================================
      // USER LOOKUP
      // ======================================================

      {
        $lookup: {
          from: "users",
          let: {
            uid: "$userId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$uid"],
                },
              },
            },
            {
              $project: {
                firstName: 1,
                lastName: 1,
                userName: 1,
              },
            },
          ],
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
        $addFields: {
          fullName: {
            $concat: [
              { $ifNull: ["$user.firstName", ""] },
              " ",
              { $ifNull: ["$user.lastName", ""] },
            ],
          },

          userName: "$user.userName",
        },
      },

      {
        $unset: ["user"],
      },

      // ======================================================
      // GROUP
      // ======================================================

      {
        $group: {
          _id: {
            referenceId: "$referenceId",
            userId: "$userId",
          },

          entries: {
            $push: "$$ROOT",
          },

          createdAt: {
            $max: "$createdAt",
          },
        },
      },

      // ======================================================
      // FLAGS
      // ======================================================

      {
        $addFields: {
          hasRefund: {
            $anyElementTrue: {
              $map: {
                input: "$entries",
                as: "e",
                in: {
                  $eq: ["$$e.entryType", "REFUND"],
                },
              },
            },
          },

          hasCommission: {
            $anyElementTrue: {
              $map: {
                input: "$entries",
                as: "e",
                in: {
                  $eq: ["$$e.entryType", "COMMISSION"],
                },
              },
            },
          },

          hasWalletRefill: {
            $anyElementTrue: {
              $map: {
                input: "$entries",
                as: "e",
                in: {
                  $eq: ["$$e.entryType", "WALLET_REFILL"],
                },
              },
            },
          },

          hasAEPS: {
            $anyElementTrue: {
              $map: {
                input: "$entries",
                as: "e",
                in: {
                  $eq: ["$$e.serviceType", "AEPS_TO_MAIN"],
                },
              },
            },
          },
        },
      },

      // ======================================================
      // MERGE CONDITION
      // ======================================================

      {
        $addFields: {
          shouldMerge: {
            $and: [
              {
                $not: ["$hasRefund"],
              },
              {
                $not: ["$hasWalletRefill"],
              },
              {
                $not: ["$hasAEPS"],
              },
              "$hasCommission",
            ],
          },
        },
      },

      // ======================================================
      // MERGE LOGIC
      // ======================================================

      {
        $project: {
          createdAt: 1,

          data: {
            $cond: [
              "$shouldMerge",

              [
                {
                  $mergeObjects: [
                    // MAIN ENTRY
                    {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$entries",
                            as: "e",
                            cond: {
                              $ne: ["$$e.entryType", "COMMISSION"],
                            },
                          },
                        },
                        0,
                      ],
                    },

                    // COMMISSION
                    {
                      commission: {
                        $sum: {
                          $map: {
                            input: "$entries",
                            as: "e",
                            in: {
                              $cond: [
                                {
                                  $eq: ["$$e.entryType", "COMMISSION"],
                                },
                                "$$e.amount",
                                0,
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              ],

              "$entries",
            ],
          },
        },
      },

      {
        $unwind: "$data",
      },

      {
        $replaceRoot: {
          newRoot: "$data",
        },
      },

      // ======================================================
      // TDS LOOKUP
      // ======================================================

      {
        $lookup: {
          from: "tdsledgers",

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
              $group: {
                _id: null,

                commissionAmount: {
                  $sum: "$commissionAmount",
                },

                tdsAmount: {
                  $sum: "$tdsAmount",
                },

                netCommission: {
                  $sum: "$netCommission",
                },
              },
            },
          ],

          as: "tds",
        },
      },

      {
        $unwind: {
          path: "$tds",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          commission: {
            $cond: [
              {
                $eq: ["$entryType", "BONUS"],
              },
              0,
              {
                $ifNull: ["$tds.commissionAmount", "$commission"],
              },
            ],
          },

          tdsAmount: {
            $cond: [
              {
                $eq: ["$entryType", "BONUS"],
              },
              0,
              {
                $ifNull: ["$tds.tdsAmount", 0],
              },
            ],
          },

          netCommission: {
            $cond: [
              {
                $eq: ["$entryType", "BONUS"],
              },
              0,
              {
                $ifNull: ["$tds.netCommission", 0],
              },
            ],
          },
        },
      },

      {
        $unset: ["tds"],
      },

      // ======================================================
      // GST LOOKUP
      // ======================================================

      {
        $lookup: {
          from: "gstledgers",

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
              $group: {
                _id: null,

                chargesAmount: {
                  $sum: "$chargesAmount",
                },

                gstAmount: {
                  $sum: "$gstAmount",
                },

                totalCharge: {
                  $sum: "$totalCharge",
                },
              },
            },
          ],

          as: "gst",
        },
      },

      {
        $unwind: {
          path: "$gst",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $addFields: {
          chargesAmount: {
            $cond: [
              {
                $eq: ["$entryType", "BONUS"],
              },
              0,
              {
                $ifNull: ["$gst.chargesAmount", 0],
              },
            ],
          },

          gstAmount: {
            $cond: [
              {
                $eq: ["$entryType", "BONUS"],
              },
              0,
              {
                $ifNull: ["$gst.gstAmount", 0],
              },
            ],
          },

          totalCharges: {
            $cond: [
              {
                $eq: ["$entryType", "BONUS"],
              },
              0,
              {
                $ifNull: ["$gst.totalCharge", 0],
              },
            ],
          },
        },
      },

      {
        $unset: ["gst"],
      },
    ];

    // ======================================================
    // DATA PIPELINE
    // ======================================================

    const dataPipeline = [
      ...basePipeline,

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
    ];

    const walletLedger = await WalletLedger.aggregate(dataPipeline);

    // ======================================================
    // TOTAL COUNT
    // ======================================================

    const totalAgg = await WalletLedger.aggregate([
      ...basePipeline,
      {
        $count: "total",
      },
    ]);

    const total = totalAgg[0]?.total || 0;

    // ======================================================
    // FORMAT RESPONSE
    // ======================================================

    const formattedData = walletLedger.map((item) => {
      const { amount, ...rest } = item;

      return {
        ...rest,

        amount:
          item?.entryType === "BONUS"
            ? paiseToRupee(amount || 0)
            : paiseToRupee(
                (amount || 0) -
                  (item?.chargesAmount || 0) -
                  (item?.gstAmount || 0),
              ),

        openingBalance: paiseToRupee(item?.openingBalance || 0),

        closingBalance: paiseToRupee(item?.closingBalance || 0),

        chargesAmount: paiseToRupee(item?.chargesAmount || 0),

        gstAmount: paiseToRupee(item?.gstAmount || 0),

        totalCharges: paiseToRupee(item?.totalCharges || 0),

        commission: paiseToRupee(item?.commission || 0),

        tdsAmount: paiseToRupee(item?.tdsAmount || 0),

        netCommission: paiseToRupee(item?.netCommission || 0),
      };
    });

    return res.status(200).json({
      success: true,
      message: "Wallet Ledger fetched successfully",
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

// exports.getAllLedgetEntryList = async (req, res, next) => {
//   try {
//     let {
//       page = 1,
//       limit = 10,
//       search = "",
//       from = "",
//       to = "",
//       userId = "",
//     } = req.query;
//     page = Number(page);
//     limit = Number(limit);
//     search = search?.trim();
//     const skip = (page - 1) * limit;

//     const filter = {};

//     if (isNaN(page) || page < 1) {
//       return res.status(400).json({
//         success: false,
//         message: "Page must be a valid number greater than 0",
//       });
//     }

//     if (isNaN(limit) || limit < 1 || limit > 100) {
//       return res.status(400).json({
//         success: false,
//         message: "Limit must be between 1 and 100",
//       });
//     }

//     if (from && isNaN(Date.parse(from))) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid 'from' date",
//       });
//     }

//     if (to && isNaN(Date.parse(to))) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid 'to' date",
//       });
//     }

//     if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid user id",
//       });
//     }

//     if (userId) {
//       const isUserExist = await User.findOne({ _id: userId });

//       if (!isUserExist) {
//         return res.status(404).json({
//           success: false,
//           message: "User not Found",
//         });
//       }
//     }

//     if (userId) {
//       filter.userId = new mongoose.Types.ObjectId(userId);
//     }

//     // Filter by date range
//     if (from || to) {
//       filter.createdAt = {};

//       if (from) {
//         filter.createdAt.$gte = new Date(from);
//       }

//       if (to) {
//         filter.createdAt.$lte = new Date(to);
//       }
//     }

//     if (search) {
//       filter.$or = [
//         {
//           openingBalance: {
//             $regex: search,
//             $options: "i",
//           },
//         },

//         {
//           closingBalance: {
//             $regex: search,
//             $options: "i",
//           },
//         },
//         {
//           referenceId: {
//             $regex: search,
//             $options: "i",
//           },
//         },
//       ];
//     }

//     const walletLedger = await WalletLedger.aggregate([
//       {
//         $match: filter,
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "userId",
//           foreignField: "_id",
//           as: "user",
//         },
//       },
//       {
//         $unwind: "$user",
//       },
//       {
//         $addFields: {
//           fullName: { $concat: ["$user.firstName", " ", "$user.lastName"] },
//           userName: "$user.userName",
//         },
//       },
//       {
//         $project: {
//           userId: 1,
//           serviceType: 1,
//           fullName: 1,
//           userName: 1,
//           wallet: 1,
//           type: 1,
//           amount: 1,
//           openingBalance: 1,
//           closingBalance: 1,
//           description: 1,
//           referenceId: 1,
//           createdAt: 1,
//           updatedAt: 1,
//         },
//       },
//       {
//         $sort: {
//           createdAt: -1,
//         },
//       },
//       {
//         $skip: skip,
//       },
//       {
//         $limit: limit,
//       },
//     ]);

//     const total = await WalletLedger.countDocuments(filter);

//     const formattedData = walletLedger.map((item) => ({
//       ...item,
//       amount: paiseToRupee(item?.amount),
//       openingBalance: paiseToRupee(item?.openingBalance),
//       closingBalance: paiseToRupee(item?.closingBalance),
//     }));

//     return res.status(200).json({
//       success: true,
//       message: "Wallet Ledger fetched successfully",
//       data: formattedData,
//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// exports.getAllLedgetEntryList = async (req, res, next) => {
//   try {
//     let {
//       page = 1,
//       limit = 10,
//       search = "",
//       from = "",
//       to = "",
//       userId = "",
//       referenceId = "",
//     } = req.query;

//     page = Number(page);
//     limit = Number(limit);
//     search = search?.trim();

//     const skip = (page - 1) * limit;
//     const filter = {};

//     if (referenceId) filter.referenceId = referenceId;

//     // ===============================
//     //  VALIDATIONS
//     // ===============================
//     if (isNaN(page) || page < 1)
//       return res.status(400).json({ success: false, message: "Invalid page" });

//     if (isNaN(limit) || limit < 1 || limit > 100)
//       return res.status(400).json({ success: false, message: "Invalid limit" });

//     if (userId && !mongoose.Types.ObjectId.isValid(userId))
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid userId" });

//     if (userId) {
//       const user = await User.findById(userId);
//       if (!user)
//         return res
//           .status(404)
//           .json({ success: false, message: "User not found" });

//       filter.userId = new mongoose.Types.ObjectId(userId);
//     }

//     if (from || to) {
//       filter.createdAt = {};
//       if (from) filter.createdAt.$gte = new Date(from);
//       if (to) filter.createdAt.$lte = new Date(to);
//     }

//     const escapeRegex = (text) => {
//       return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
//     };

//     const safeSearch = escapeRegex(search);

//     if (search) {
//       filter.$or = [
//         { referenceId: { $regex: safeSearch, $options: "i" } },
//         { description: { $regex: search, $options: "i" } },
//       ];
//     }

//     // ===============================
//     //  BASE PIPELINE
//     // ===============================

//     const basePipeline = [
//       { $match: filter },

//       {
//         $lookup: {
//           from: "users",
//           let: { uid: "$userId" },
//           pipeline: [
//             { $match: { $expr: { $eq: ["$_id", "$$uid"] } } },
//             { $project: { firstName: 1, lastName: 1, userName: 1 } },
//           ],
//           as: "user",
//         },
//       },
//       { $unwind: "$user" },

//       {
//         $addFields: {
//           fullName: {
//             $concat: ["$user.firstName", " ", "$user.lastName"],
//           },
//           userName: "$user.userName",
//         },
//       },

//       { $unset: ["user"] },

//       //  GROUP
//       {
//         $group: {
//           _id: {
//             referenceId: "$referenceId",
//             userId: "$userId",
//           },

//           entries: {
//             $push: "$$ROOT",
//           },
//         },
//       },

//       //  FLAGS
//       {
//         $addFields: {
//           hasRefund: {
//             $anyElementTrue: {
//               $map: {
//                 input: "$entries",
//                 as: "e",
//                 in: { $eq: ["$$e.entryType", "REFUND"] },
//               },
//             },
//           },

//           hasCommission: {
//             $anyElementTrue: {
//               $map: {
//                 input: "$entries",
//                 as: "e",
//                 in: { $eq: ["$$e.entryType", "COMMISSION"] },
//               },
//             },
//           },

//           hasWalletRefill: {
//             $anyElementTrue: {
//               $map: {
//                 input: "$entries",
//                 as: "e",
//                 in: { $eq: ["$$e.entryType", "WALLET_REFILL"] },
//               },
//             },
//           },

//           hasAEPS: {
//             $anyElementTrue: {
//               $map: {
//                 input: "$entries",
//                 as: "e",
//                 in: { $eq: ["$$e.serviceType", "AEPS_TO_MAIN"] },
//               },
//             },
//           },
//         },
//       },

//       //  MERGE CONDITION
//       {
//         $addFields: {
//           shouldMerge: {
//             $and: [
//               { $not: ["$hasRefund"] },
//               { $not: ["$hasWalletRefill"] },
//               { $not: ["$hasAEPS"] },
//               "$hasCommission",
//             ],
//           },
//         },
//       },

//       //  MERGE LOGIC
//       {
//         $project: {
//           data: {
//             $cond: [
//               "$shouldMerge",
//               [
//                 {
//                   $mergeObjects: [
//                     {
//                       $arrayElemAt: [
//                         {
//                           $filter: {
//                             input: "$entries",
//                             as: "e",
//                             cond: {
//                               $ne: ["$$e.entryType", "COMMISSION"],
//                             },
//                           },
//                         },
//                         0,
//                       ],
//                     },
//                     {
//                       commission: {
//                         $sum: {
//                           $map: {
//                             input: "$entries",
//                             as: "e",
//                             in: {
//                               $cond: [
//                                 { $eq: ["$$e.entryType", "COMMISSION"] },
//                                 "$$e.amount",
//                                 0,
//                               ],
//                             },
//                           },
//                         },
//                       },
//                     },
//                   ],
//                 },
//               ],
//               "$entries",
//             ],
//           },
//         },
//       },

//       { $unwind: "$data" },
//       { $replaceRoot: { newRoot: "$data" } },

//       // ===============================
//       //  TDS LOOKUP (NO tdsRate)
//       // ===============================
//       {
//         $lookup: {
//           from: "tdsledgers",
//           let: { refId: "$referenceId" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: { $eq: ["$referenceId", "$$refId"] },
//               },
//             },
//             {
//               $project: {
//                 commissionAmount: 1,
//                 tdsAmount: 1,
//                 netCommission: 1,
//               },
//             },
//           ],
//           as: "tds",
//         },
//       },
//       {
//         $unwind: {
//           path: "$tds",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $addFields: {
//           commission: {
//             $cond: [
//               { $eq: ["$entryType", "BONUS"] },
//               0,
//               { $ifNull: ["$tds.commissionAmount", 0] },
//             ],
//           },

//           tdsAmount: {
//             $cond: [
//               { $eq: ["$entryType", "BONUS"] },
//               0,
//               { $ifNull: ["$tds.tdsAmount", 0] },
//             ],
//           },

//           netCommission: {
//             $cond: [
//               { $eq: ["$entryType", "BONUS"] },
//               0,
//               { $ifNull: ["$tds.netCommission", 0] },
//             ],
//           },
//         },
//       },
//       {
//         $unset: ["tds"],
//       },

//       {
//         $lookup: {
//           from: "gstledgers",
//           let: { refId: "$referenceId" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: { $eq: ["$referenceId", "$$refId"] },
//               },
//             },
//             {
//               $project: {
//                 chargesAmount: 1,
//                 gstAmount: 1,
//                 totalCharge: 1,
//               },
//             },
//           ],
//           as: "gst",
//         },
//       },
//       {
//         $unwind: {
//           path: "$gst",
//           preserveNullAndEmptyArrays: true, //  IMPORTANT
//         },
//       },
//       {
//         $addFields: {
//           chargesAmount: {
//             $cond: [
//               { $eq: ["$entryType", "BONUS"] },
//               0,
//               { $ifNull: ["$gst.chargesAmount", 0] },
//             ],
//           },

//           gstAmount: {
//             $cond: [
//               { $eq: ["$entryType", "BONUS"] },
//               0,
//               { $ifNull: ["$gst.gstAmount", 0] },
//             ],
//           },

//           totalCharges: {
//             $cond: [
//               { $eq: ["$entryType", "BONUS"] },
//               0,
//               { $ifNull: ["$gst.totalCharge", 0] },
//             ],
//           },
//         },
//       },
//       {
//         $unset: ["gst"],
//       },
//     ];

//     // ===============================
//     //  DATA WITH PAGINATION
//     // ===============================
//     const dataPipeline = [
//       ...basePipeline,
//       { $sort: { createdAt: -1 } },
//       { $skip: skip },
//       { $limit: limit },
//     ];

//     const walletLedger = await WalletLedger.aggregate(dataPipeline);

//     // ===============================
//     //  TOTAL COUNT
//     // ===============================
//     const countPipeline = [...basePipeline, { $count: "total" }];
//     const totalAgg = await WalletLedger.aggregate(countPipeline);
//     const total = totalAgg[0]?.total || 0;

//     // ===============================
//     //  FORMAT
//     // ===============================
//     const formattedData = walletLedger.map((item) => {
//       const { amount, ...rest } = item;

//       return {
//         ...rest,
//         amount:
//           item?.entryType === "BONUS"
//             ? paiseToRupee(amount)
//             : paiseToRupee(
//                 amount - (item?.chargesAmount || 0) - (item?.gstAmount || 0),
//               ),
//         openingBalance: paiseToRupee(item?.openingBalance),
//         chargesAmount: paiseToRupee(item?.chargesAmount),
//         closingBalance: paiseToRupee(item?.closingBalance),
//         commission: item?.commission ? paiseToRupee(item.commission) : 0,
//         tdsAmount: item?.tdsAmount ? paiseToRupee(item.tdsAmount) : 0,
//         commission: item?.commission
//           ? paiseToRupee(item.commission)
//           : undefined,

//         netCommission: item?.netCommission
//           ? paiseToRupee(item.netCommission)
//           : undefined,

//         gstAmount: item?.gstAmount ? paiseToRupee(item.gstAmount) : 0,

//         totalCharges: paiseToRupee(
//           (item?.chargesAmount || 0) + (item?.gstAmount || 0),
//         ),
//       };
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Wallet Ledger fetched successfully",
//       data: formattedData,
//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

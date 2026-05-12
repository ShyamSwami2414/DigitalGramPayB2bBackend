const WalletLedger = require("../../models/walletLedgerModel");
const mongoose = require("mongoose");
const User = require("../../models/userModel");
const { paiseToRupee } = require("../../utils/money");

exports.aepsToEwalletHistory = async (req, res, next) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;
    page = Number(page);
    limit = Number(limit);
    search = search.trim();
    const skip = (page - 1) * limit;

    const filter = {
      wallet: "aeps",
      type: "debit",
    };

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

    if (search) {
      filter.$or = [
        {
          openingBalance: {
            $regex: search,
            $options: "i",
          },
        },

        {
          closingBalance: {
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
      ];
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
          userId: 1,
          fullName: 1,
          userName: 1,
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

    const formattedData = walletTransferHistory.map((item) => ({
      ...item,
      amount: paiseToRupee(item?.amount),
      openingBalance: paiseToRupee(item?.openingBalance),
      closingBalance: paiseToRupee(item?.closingBalance),
    }));

    const total = await WalletLedger.countDocuments(filter);

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

    if (referenceId) filter.referenceId = referenceId;

    // ===============================
    //  VALIDATIONS
    // ===============================
    if (isNaN(page) || page < 1)
      return res.status(400).json({ success: false, message: "Invalid page" });

    if (isNaN(limit) || limit < 1 || limit > 100)
      return res.status(400).json({ success: false, message: "Invalid limit" });

    if (userId && !mongoose.Types.ObjectId.isValid(userId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid userId" });

    if (userId) {
      const user = await User.findById(userId);
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    if (search) {
      filter.$or = [
        { referenceId: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // ===============================
    //  BASE PIPELINE
    // ===============================
    const basePipeline = [
      { $match: filter },

      {
        $lookup: {
          from: "users",
          let: { uid: "$userId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$uid"] } } },
            { $project: { firstName: 1, lastName: 1, userName: 1 } },
          ],
          as: "user",
        },
      },
      { $unwind: "$user" },

      {
        $addFields: {
          fullName: {
            $concat: ["$user.firstName", " ", "$user.lastName"],
          },
          userName: "$user.userName",
        },
      },

      { $unset: ["user"] },

      //  GROUP
      {
        $group: {
          _id: "$referenceId",
          entries: { $push: "$$ROOT" },
        },
      },

      //  FLAGS
      {
        $addFields: {
          hasRefund: {
            $anyElementTrue: {
              $map: {
                input: "$entries",
                as: "e",
                in: { $eq: ["$$e.entryType", "REFUND"] },
              },
            },
          },

          hasCommission: {
            $anyElementTrue: {
              $map: {
                input: "$entries",
                as: "e",
                in: { $eq: ["$$e.entryType", "COMMISSION"] },
              },
            },
          },

          hasWalletRefill: {
            $anyElementTrue: {
              $map: {
                input: "$entries",
                as: "e",
                in: { $eq: ["$$e.entryType", "WALLET_REFILL"] },
              },
            },
          },

          hasAEPS: {
            $anyElementTrue: {
              $map: {
                input: "$entries",
                as: "e",
                in: { $eq: ["$$e.serviceType", "AEPS_TO_MAIN"] },
              },
            },
          },
        },
      },

      //  MERGE CONDITION
      {
        $addFields: {
          shouldMerge: {
            $and: [
              { $not: ["$hasRefund"] },
              { $not: ["$hasWalletRefill"] },
              { $not: ["$hasAEPS"] },
              "$hasCommission",
            ],
          },
        },
      },

      //  MERGE LOGIC
      {
        $project: {
          data: {
            $cond: [
              "$shouldMerge",
              [
                {
                  $mergeObjects: [
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
                    {
                      commission: {
                        $sum: {
                          $map: {
                            input: "$entries",
                            as: "e",
                            in: {
                              $cond: [
                                { $eq: ["$$e.entryType", "COMMISSION"] },
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

      { $unwind: "$data" },
      { $replaceRoot: { newRoot: "$data" } },

      // ===============================
      //  TDS LOOKUP (NO tdsRate)
      // ===============================
      {
        $lookup: {
          from: "tdsledgers",
          let: { refId: "$referenceId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$referenceId", "$$refId"] },
              },
            },
            {
              $project: {
                commissionAmount: 1,
                tdsAmount: 1,
                netCommission: 1,
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
          commission: "$tds.commissionAmount",
          tdsAmount: "$tds.tdsAmount",
          netCommission: "$tds.netCommission",
        },
      },
      {
        $unset: ["tds"],
      },

      {
        $lookup: {
          from: "gstledgers",
          let: { refId: "$referenceId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$referenceId", "$$refId"] },
              },
            },
            {
              $project: {
                chargesAmount: 1,
                gstAmount: 1,
                totalCharge: 1,
              },
            },
          ],
          as: "gst",
        },
      },
      {
        $unwind: {
          path: "$gst",
          preserveNullAndEmptyArrays: true, //  IMPORTANT
        },
      },
      {
        $addFields: {
          chargesAmount: "$gst.chargesAmount",
          gstAmount: "$gst.gstAmount",
          totalCharges: "$gst.totalCharge",
        },
      },
      {
        $unset: ["gst"],
      },
    ];

    // ===============================
    //  DATA WITH PAGINATION
    // ===============================
    const dataPipeline = [
      ...basePipeline,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const walletLedger = await WalletLedger.aggregate(dataPipeline);

    // ===============================
    //  TOTAL COUNT
    // ===============================
    const countPipeline = [...basePipeline, { $count: "total" }];
    const totalAgg = await WalletLedger.aggregate(countPipeline);
    const total = totalAgg[0]?.total || 0;

    // ===============================
    //  FORMAT
    // ===============================
    const formattedData = walletLedger.map((item) => ({
      ...item,
      amount: paiseToRupee(item?.amount),
      openingBalance: paiseToRupee(item?.openingBalance),
      closingBalance: paiseToRupee(item?.closingBalance),
      commission: item?.commission ? paiseToRupee(item.commission) : 0,
      tdsAmount: item?.tdsAmount ? paiseToRupee(item.tdsAmount) : 0,
      commission: item?.commission ? paiseToRupee(item.commission) : undefined,

      netCommission: item?.netCommission
        ? paiseToRupee(item.netCommission)
        : undefined,

      gstAmount: item?.gstAmount ? paiseToRupee(item.gstAmount) : 0,

      totalCharges: item?.totalCharge ? paiseToRupee(item.totalCharge) : 0,
    }));

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

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
    } = req.query;

    page = Number(page);
    limit = Number(limit);
    search = search?.trim();

    const skip = (page - 1) * limit;
    const filter = {};

    // ✅ Validations
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

    if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user id",
      });
    }

    if (userId) {
      const isUserExist = await User.findById(userId);
      if (!isUserExist) {
        return res.status(404).json({
          success: false,
          message: "User not Found",
        });
      }
      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    // ✅ Date filter
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    // ✅ Search
    if (search) {
      filter.$or = [
        { openingBalance: { $regex: search, $options: "i" } },
        { closingBalance: { $regex: search, $options: "i" } },
        { referenceId: { $regex: search, $options: "i" } },
      ];
    }

    // ✅ Aggregation
    const walletLedger = await WalletLedger.aggregate([
      { $match: filter },
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
        $addFields: {
          fullName: { $concat: ["$user.firstName", " ", "$user.lastName"] },
          userName: "$user.userName",
        },
      },
      {
        $project: {
          userId: 1,
          serviceType: 1,
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
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const total = await WalletLedger.countDocuments(filter);

    // ===============================
    // 🔥 BUSINESS LOGIC STARTS HERE
    // ===============================

    const grouped = {};

    // ✅ Group by referenceId
    for (const item of walletLedger) {
      const ref = item.referenceId;
      if (!grouped[ref]) grouped[ref] = [];
      grouped[ref].push(item);
    }

    const finalData = [];

    for (const ref in grouped) {
      const entries = grouped[ref];

      // ✅ Case 1: single entry
      if (entries.length === 1) {
        finalData.push(entries[0]);
        continue;
      }

      // ❌ Case 2: REFUND present → don't merge
      const hasRefund = entries.some((e) => e.serviceType === "REFUND");
      if (hasRefund) {
        finalData.push(...entries);
        continue;
      }

      // ❌ Case 3: debit + credit → don't merge
      const types = new Set(entries.map((e) => e.type));
      if (types.has("debit") && types.has("credit")) {
        finalData.push(...entries);
        continue;
      }

      // ✅ Case 4: merge
      const base = entries[0];

      const merged = { ...base };

      for (const e of entries) {
        const key = e.serviceType.toLowerCase(); // dynamic key
        merged[key] = paiseToRupee(e.amount);
      }

      finalData.push(merged);
    }

    // ✅ Format amounts
    const formattedData = finalData.map((item) => ({
      ...item,
      amount: paiseToRupee(item?.amount),
      openingBalance: paiseToRupee(item?.openingBalance),
      closingBalance: paiseToRupee(item?.closingBalance),
    }));

    // ===============================
    // 🔥 RESPONSE
    // ===============================
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

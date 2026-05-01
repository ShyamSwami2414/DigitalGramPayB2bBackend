const PayoutTransaction = require("../../models/sozopayoutTransactionModel");
const mongoose = require("mongoose");
const User = require("../../models/userModel");
const { paiseToRupee } = require("../../utils/money");

exports.myAllTransaction = async (req, res, next) => {
  try {
    let {
      user = "",
      status = "",
      from = "",
      to = "",
      range = "",
      page = 1,
      limit = 10,
    } = req.query;

    user = user?.trim();
    status = status?.trim().toLowerCase();

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {
      serviceType: "XPRESS_PAYOUT",
    };

    // ✅ STATUS FILTER
    if (status) {
      filter.status = status.toUpperCase();
    }

    // ✅ DATE FILTER (simple version)
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const t = new Date(to);
        t.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = t;
      }
    }

    // ✅ USER FILTER (SELF ONLY OR SPECIFIC)
    let userIds = [];

    if (user) {
      if (!mongoose.Types.ObjectId.isValid(user)) {
        const err = new Error("Invalid user ID");
        err.status = 400;
        throw err;
      }
      userIds = [new mongoose.Types.ObjectId(user)];
    } else {
      userIds = [new mongoose.Types.ObjectId(req.user.id)];
    }

    filter.userId = { $in: userIds };

    // ✅ AGGREGATION WITH LOOKUP
    const pipeline = [
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
        $project: {
          _id: 1,
          referenceId: 1,
          bankAccount: 1,
          ifsc: 1,
          beneficiaryName: 1,
          beneficiaryPhone: 1,
          amount: 1,
          status: 1,
          createdAt: 1,

          // ✅ user fields
          "user.firstName": 1,
          "user.lastName": 1,
          "user.mobile": 1,
          "user.email": 1,

          //  hidden fields automatically excluded
        },
      },

      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const [transactions, total] = await Promise.all([
      PayoutTransaction.aggregate(pipeline),
      PayoutTransaction.countDocuments(filter),
    ]);

    // ✅ FORMAT RESPONSE
    const formattedData = transactions.map((txn) => ({
      id: txn._id,
      referenceId: txn.referenceId,

      user: {
        name: `${txn.user.firstName || ""} ${txn.user.lastName || ""}`.trim(),
        phone: txn.user.mobile,
        email: txn.user.email,
      },

      bankAccount: txn.bankAccount,
      ifsc: txn.ifsc,
      beneficiaryName: txn.beneficiaryName,
      beneficiaryPhone: txn.beneficiaryPhone,
      amount: paiseToRupee(txn.amount),

      status: txn.status,
      createdAt: txn.createdAt,
    }));

    return res.status(200).json({
      success: true,
      message: "Xpress Payout Report",
      data: formattedData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

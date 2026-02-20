const FundRequest = require("../../models/fundRequestModel");
const User = require("../../models/userModel");
const UserWallet = require("../../models/userWallet");
const WalletLedger = require("../../models/walletLedgerModel");
const mongoose = require("mongoose");

exports.fundRequestStats = async (req, res, next) => {
  try {

    const result = await FundRequest.aggregate([
      {
        $match: {}
      },
      {
        $group: {
          _id: null,
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
          },
          approved: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
          },
          total: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          pending: 1,
          approved: 1,
          rejected: 1,
          // total: 1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      message: "Fund requests stats fetched successfully",
      data: result[0] || { pending: 0, approved: 0, rejected: 0, total: 0 }
    });

  } catch (error) {
    next(error);
  }
}

exports.getAllFundRequests = async (req, res, next) => {
  try {
    let { page = 1, limit = 10, status = "", search = "" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    status = status.trim();
    search = search.trim();
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) {
      filter.status = status.toLowerCase();
    }

    const fundRequests = await FundRequest.aggregate([
      {
        $match: filter
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          userName: {
            $concat: [
              "$user.firstName", " ", "$user.lastName"
            ]
          },
        }
      },
      {
        $project: {
          user: 0
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }

    ])

    console.log(fundRequests, "fundRequests");

    const total = await FundRequest.countDocuments(filter)

    return res.status(200).json({
      success: true,
      message: "Fund requests fetched successfully",
      data: fundRequests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })

  } catch (error) {
    next(error);
  }
}

exports.approveFundRequest = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    let openingBalance = 0;
    let closingBalance = 0;

    if (!id) {
      const err = new Error("Invalid fund request ID");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid fund request ID");
      err.statusCode = 400;
      throw err;
    }

    const fundRequest = await FundRequest.findOneAndUpdate(
      {
        _id: id,
        status: "pending"
      },
      {
        $set: {
          status: "approved",
        }
      },
      {
        new: true,
        session
      }
    )

    if (!fundRequest) {
      const err = new Error("Fund request already processed or not found");
      err.statusCode = 400;
      throw err;
    }

    const fundRequestUser = await User.findOne(
      {
        _id: fundRequest.userId,
        isDeleted: false
      },
      null,
      { session }
    )

    if (!fundRequestUser) {
      const err = new Error("User not found");
      err.statusCode = 400;
      throw err;
    }

    const wallet = await UserWallet.findOneAndUpdate(
      {
        userId: fundRequest.userId,
        isDeleted: false
      },
      {
        $inc: { mainWallet: fundRequest.amount }
      },
      { new: true, session }
    )

    if (!wallet) {
      const err = new Error("User wallet not found");
      err.statusCode = 400;
      throw err;
    }

    closingBalance = wallet.mainWallet;
    openingBalance = closingBalance - fundRequest.amount;

    await WalletLedger.create([
      {
        userId: fundRequest.userId,
        wallet: "main",
        type: "credit",

        amount: fundRequest.amount,
        openingBalance: openingBalance,
        closingBalance: closingBalance,

        referenceId: fundRequest._id,
        description: "Fund request approved",
      }
    ], { session })

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Fund request approved successfully",
      data: fundRequest,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
}

exports.rejectFundRequest = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { id } = req.params;
    let { rejectionReason } = req.body;
    rejectionReason = rejectionReason?.trim();

    if (!id) {
      const err = new Error("Fund request ID is required");
      err.statusCode = 400;
      throw err;
    }

    if (!rejectionReason) {
      const err = new Error("Rejection reason is required");
      err.statusCode = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid fund request ID");
      err.statusCode = 400;
      throw err;
    }

    const fundRequest = await FundRequest.findOneAndUpdate(
      {
        _id: id,
        status: "pending"
      },
      {
        $set: {
          status: "rejected",
          rejectionReason: rejectionReason,
          rejectedAt: new Date()
        }
      },
      {
        new: true,
        session
      }
    )

    if (!fundRequest) {
      const err = new Error("Fund request already processed or not found");
      err.statusCode = 400;
      throw err;
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Fund request rejected successfully",
      data: fundRequest,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
}

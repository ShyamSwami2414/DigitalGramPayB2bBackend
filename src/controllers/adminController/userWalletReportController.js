const mongoose = require("mongoose");
const User = require("../../models/userModel");
const UserWalletReport = require("../../models/userWalletReportModel");

exports.getCompleteUserWalletReportHistory = async (req, res, next) => {
  try {
    let {
      page = 1,
      limit = 10,
      userId = "",
      type = "",
      wallet = "",
      from = "",
      to = "",
      search = "",
    } = req.query;

    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    type = type?.trim().toLowerCase();
    wallet = wallet?.trim().toLowerCase();
    search = search?.trim();

    const match = {};

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID",
        });
      }
      match.userId = new mongoose.Types.ObjectId(userId);
    }

    if (type) {
      if (!["hold", "release", "credit", "debit"].includes(type)) {
        return res.status(400).json({ message: "Invalid type" });
      }
      match.type = type;
    }

    if (wallet) {
      if (!["aeps", "main"].includes(wallet)) {
        return res.status(400).json({ message: "Invalid wallet type" });
      }
      match.wallet = wallet;
    }

    if (from || to) {
      match.createdAt = {};

      if (from) {
        const fromDate = new Date(from);
        if (isNaN(fromDate)) {
          return res.status(400).json({ message: "Invalid from date" });
        }
        match.createdAt.$gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);
        if (isNaN(toDate)) {
          return res.status(400).json({ message: "Invalid to date" });
        }
        match.createdAt.$lte = toDate;
      }
    }

    const result = await UserWalletReport.aggregate([
      { $match: match },

      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "admins",
          localField: "actionBy",
          foreignField: "_id",
          as: "actionTaker",
        },
      },
      { $unwind: { path: "$actionTaker", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          fullName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$user.firstName", ""] },
                  " ",
                  { $ifNull: ["$user.lastName", ""] },
                ],
              },
            },
          },
          userName: "$actionTaker.userName" || "",
        },
      },

      ...(search
        ? [
            {
              $match: {
                $or: [
                  { firstName: { $regex: search, $options: "i" } },
                  { lastName: { $regex: search, $options: "i" } },
                  { fullName: { $regex: search, $options: "i" } },
                  { reason: { $regex: search, $options: "i" } },
                  { type: { $regex: search, $options: "i" } },
                  { wallet: { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),

      { $sort: { createdAt: -1 } },

      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                userId: 1,
                userName: 1,
                wallet: 1,
                amount: 1,
                type: 1,
                reason: 1,
                // actionBy: 1,
                createdAt: 1,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const history = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    return res.status(200).json({
      success: true,
      message: "Wallet Report History fetched successfully",
      data: history,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

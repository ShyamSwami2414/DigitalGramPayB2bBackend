const UserWhitelistAccount = require("../../models/userWhitelistAccountModel");
const mongoose = require("mongoose");

exports.getAccountWhitelistRequest = async (req, res, next) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const filter = {
      // status: "pending",
      isActive: true,
      isDeleted: false,
    };

    const accountWhitelistRequests = await UserWhitelistAccount.aggregate([
      {
        $match: filter, // 🔍 same as find(filter)
      },
      {
        $lookup: {
          from: "users", // ⚠️ collection name (not model name)
          localField: "userId",
          foreignField: "_id",
          as: "userId",
        },
      },
      {
        $unwind: {
          path: "$userId",
          preserveNullAndEmptyArrays: true, // optional
        },
      },

      {
        $project: {
          // keep all fields + only selected user fields

          userId: "$user._id",
          name: "$user.name",
          email: "$user.email",
          phone: "$user.phone",
          // include other fields you want
          accountNumber: 1,
          ifscCode: 1,
          accountHolderName: 1,
          bankName: 1,
          createdAt: 1,
          status: 1,
          chequeImageUrl: 1,
          passbookOrBankStatementUrl: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    const total = await UserWhitelistAccount.countDocuments(filter);

    if (!accountWhitelistRequests) {
      return res.status(200).json({
        success: true,
        message: "Account whitelist requests not found",
        data: [],
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          total,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Account whitelist requests fetched successfully",
      data: accountWhitelistRequests,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.approveRejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { status, reason } = req.body;
    status = status?.trim().toLowerCase();
    reason = reason?.trim();

    const requiredFields = ["status"];
    const missingFields = [];

    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Account whitelist request ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account whitelist request ID",
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    if (status === "rejected" && !reason) {
      return res.status(400).json({
        success: false,
        message: "Reason is required",
      });
    }

    const accountWhitelistRequest = await UserWhitelistAccount.findOneAndUpdate(
      {
        _id: id,
        status: "pending",
      },
      {
        $set: {
          status,
          reason,
        },
      },
      { new: true },
    );

    if (!accountWhitelistRequest) {
      return res.status(404).json({
        success: false,
        message: "Account whitelist request not found or already processed",
      });
    }

    res.status(200).json({
      success: true,
      message: `Account whitelist request ${status} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

const AepsPayoutBank = require("../../models/sozoAepsPayoutBankRequestModel");
const mongoose = require("mongoose");

exports.aepsPayoutBankRequests = async (req, res, next) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;
    page = Number(page);
    limit = Number(limit);
    search = search.trim();

    const skip = (page - 1) * limit;

    const filter = {
      isDeleted: false,
      status: "pending",
    };

    if (search) {
      filter.$or = [
        { bankName: { $regex: search, $options: "i" } },
        { accountHolderName: { $regex: search, $options: "i" } },
        { accountNumber: { $regex: search, $options: "i" } },
        { ifscCode: { $regex: search, $options: "i" } },
      ];
    }

    const payoutBankRequests = await AepsPayoutBank.aggregate([
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
      {
        $addFields: {
          fullName: { $concat: ["$user.firstName", " ", "$user.lastName"] },
          userName: "$user.userName",
        },
      },
      {
        $project: {
          bankName: 1,
          fullName: 1,
          userName: 1,
          accountHolderName: 1,
          accountNumber: 1,
          ifscCode: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          chequeUrl : 1
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

    const total = await AepsPayoutBank.countDocuments();

    return res.status(200).json({
      success: true,
      message: "Payout bank requests fetched successfully",
      data: payoutBankRequests,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalRequests: total,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.approveRejectAepsPayoutBankRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { status } = req.body;
    status = status?.trim()?.toLowerCase();

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Bank ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Bank ID",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const payoutBankRequest = await AepsPayoutBank.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        isDeleted: false,
        status: "pending",
      },
      {
        $set: {
          status: status,
        },
      },
      { new: true },
    );

    if (!payoutBankRequest) {
      return res.status(404).json({
        success: false,
        message: "Payout bank request not found or already approved/rejected",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        status === "approved"
          ? "Payout bank request approved"
          : "Payout bank request rejected",
      data: payoutBankRequest,
    });
  } catch (error) {
    next(error);
  }
};

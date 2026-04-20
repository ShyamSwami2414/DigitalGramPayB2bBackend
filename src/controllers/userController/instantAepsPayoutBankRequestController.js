const mongoose = require("mongoose");
const AepsPayoutBank = require("../../models/instantAepsPayoutBankModel");
const User = require("../../models/userModel");
const InstantAepsOutlet = require("../../models/instantAepsOutletModel");

// this api give only approved bank list for select bar
exports.getApprovedAepsBankList = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const userExist = await User.findOne({
      _id: userId,
      isActive: true,
      isDeleted: false,
    });

    if (!userExist) {
      return res.status(400).json({
        success: false,
        message: "User not found or not active",
      });
    }

    const approvedAepsPayoutBanks = await AepsPayoutBank.aggregate([
      {
        $match: {
          userId: userId,
          status: "approved",
          isDeleted: false,
        },
      },
      // {
      //     $project: {
      //         bankName: 1,
      //     }
      // },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    if (!approvedAepsPayoutBanks) {
      return res.status(200).json({
        success: true,
        message: "No Approved AEPS Payout Bank Available",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "AEPS payout bank list fetched successfully",
      data: approvedAepsPayoutBanks,
    });
  } catch (error) {
    next(error);
  }
};

//this api give all list whether approved or not
exports.getAepsPayoutBanks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const aepsPayoutBank = await AepsPayoutBank.find({
      userId,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "AEPS payout bank list",
      data: aepsPayoutBank,
    });
  } catch (error) {
    next(error);
  }
};

exports.addAepsPayoutBank = async (req, res, next) => {
  try {
    const { bankName, accountHolderName, accountNumber, ifscCode } = req.body;
    console.log(req.file);
    console.log(req.body);
    const cheque = req?.file?.filename;
    const userId = req.user.id;
    const requiredField = [
      "bankName",
      "accountHolderName",
      "accountNumber",
      "ifscCode",
    ];
    const missingFields = [];

    requiredField.forEach((field) => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${missingFields.join(", ")} is required`,
      });
    }

    if (!cheque) {
      return res.status(400).json({
        success: false,
        message: `Cheque is required`,
      });
    }

    const accountExist = await AepsPayoutBank.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      accountNumber: accountNumber,
      isDeleted: false,
    });

    if (accountExist) {
      return res.status(400).json({
        success: false,
        message: "Account number already exists",
      });
    }

    const userExist = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      isActive: true,
      isDeleted: false,
    })
      .select("_id firstName lastName")
      .lean();

    if (!userExist) {
      return res.status(400).json({
        success: false,
        message: "User not found or not active",
      });
    }

    const fullName = userExist?.firstName + " " + userExist?.lastName;

    console.log(fullName, "fullName");

    if (accountHolderName !== fullName) {
      return res.status(400).json({
        success: false,
        message: "Only User's own account can be added for aeps payout",
      });
    }

    const instantOutlet = await InstantAepsOutlet.findOne({
      userId: userId,
    })
      .select("aepsLimits aepsPayoutBanksAdded")
      .lean();

    if (!instantOutlet) {
      return res.status(400).json({
        success: false,
        message: "Outlet not found",
      });
    }

    console.log(instantOutlet, "instantOutlet");

    if (
      instantOutlet?.aepsPayoutBanksAdded >=
      instantOutlet?.aepsLimits?.allowedBankLimits
    ) {
      return res.status(400).json({
        success: false,
        message: `Maximum account adding limit : ${instantOutlet?.aepsLimits?.allowedBankLimits}  `,
      });
    }

    const aepsPayoutBank = await AepsPayoutBank.create({
      userId,
      bankName,
      accountHolderName,
      accountNumber,
      ifscCode,
      chequeUrl: `uploads/aepsPayoutCheque/${cheque}`,
    });

    await InstantAepsOutlet.findOneAndUpdate(
      {
        userId: userId,
      },
      { $inc: { aepsPayoutBanksAdded: 1 } },
    );

    return res.status(201).json({
      success: true,
      message: "AEPS payout bank request added successfully",
      data: aepsPayoutBank,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAepsPayoutBank = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log(id, "id");
    console.log(userId, "userId");

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

    const aepsPayoutBank = await AepsPayoutBank.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(userId),
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      },
      {
        new: true,
      },
    );

    if (!aepsPayoutBank) {
      return res.status(404).json({
        success: false,
        message: "AEPS payout bank not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "AEPS payout bank deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

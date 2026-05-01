const mongoose = require("mongoose");
const XpressPayoutBank = require("../../models/sozoXpressPayoutBankModel");
const SozoPayoutBank = require("../../models/sozoAepsPayoutBankModel");
const User = require("../../models/userModel");
const InstantAepsOutlet = require("../../models/instantAepsOutletModel");
const stringSimilarity = require("string-similarity");
const normalizeName = (name) => {
  return name?.toLowerCase()?.trim()?.replace(/\s+/g, " "); // remove extra spaces
};

//this api give all list whether approved or not
exports.getXpressPayoutBanks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const xpressPayoutBank = await XpressPayoutBank.find({
      userId,
      isActive: true,
      isDeleted: false,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Xpress payout bank list",
      data: xpressPayoutBank,
    });
  } catch (error) {
    next(error);
  }
};

exports.addXpressPayoutBank = async (req, res, next) => {
  try {
    const { bankId, accountHolderName, accountNumber, ifscCode } = req.body;
    console.log(req.file);
    console.log(req.body);

    const userId = req.user.id;
    const requiredField = [
      "bankId",
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

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Bank ID",
      });
    }

    const objectUserId = new mongoose.Types.ObjectId(userId);

    const [payoutBank, accountExist, user] = await Promise.all([
      SozoPayoutBank.findOne({ _id: bankId }).lean(),

      XpressPayoutBank.findOne({
        userId: objectUserId,
        accountNumber,
        isDeleted: false,
      }).lean(),

      User.findOne({
        _id: objectUserId,
        isActive: true,
        isDeleted: false,
      })
        .select("_id firstName lastName")
        .lean(),
    ]);

    if (!payoutBank) {
      return res.status(400).json({
        success: false,
        message: "Payout Bank Invalid",
      });
    }

    if (accountExist) {
      return res.status(400).json({
        success: false,
        message: "Account number already exists",
      });
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found or not active",
      });
    }

    const xpressPayoutBank = await XpressPayoutBank.create({
      userId,
      bankName: payoutBank?.bankName,
      payoutBankId: payoutBank?.bankId,
      accountHolderName,
      accountNumber,
      ifscCode,
    });

    return res.status(201).json({
      success: true,
      message: "Payout bank added successfully",
      data: xpressPayoutBank,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteXpressPayoutBank = async (req, res, next) => {
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

    const xpressPayoutBank = await XpressPayoutBank.findOneAndUpdate(
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

    if (!xpressPayoutBank) {
      return res.status(404).json({
        success: false,
        message: "Payout bank not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payout bank deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

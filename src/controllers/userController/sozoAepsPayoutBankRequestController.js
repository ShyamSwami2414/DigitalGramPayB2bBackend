const mongoose = require("mongoose");
const AepsPayoutBankRequest = require("../../models/sozoAepsPayoutBankRequestModel");
const SozoAepsPayoutBank = require("../../models/sozoAepsPayoutBankModel");
const User = require("../../models/userModel");
const InstantAepsOutlet = require("../../models/instantAepsOutletModel");
const stringSimilarity = require("string-similarity");
const normalizeName = (name) => {
  return name?.toLowerCase()?.trim()?.replace(/\s+/g, " "); // remove extra spaces
};

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

    const approvedAepsPayoutBanks = await AepsPayoutBankRequest.aggregate([
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
    const aepsPayoutBank = await AepsPayoutBankRequest.find({
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
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { bankId, accountHolderName, accountNumber, ifscCode } = req.body;
    console.log(req.file);
    console.log(req.body);
    const cheque = req?.file?.filename;
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
      const err = new Error(`${missingFields.join(", ")} is required`);
      err.status = 400;
      throw err;
    }

    if (!cheque) {
      const err = new Error("Cheque is required");
      err.status = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(bankId)) {
      const err = new Error("Invalid Bank ID");
      err.status = 400;
      throw err;
    }

    const objectUserId = new mongoose.Types.ObjectId(userId);

    const [payoutBank, accountExist, user] = await Promise.all([
      SozoAepsPayoutBank.findOne({ _id: bankId }).lean(),

      AepsPayoutBankRequest.findOne({
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
      const err = new Error("Payout Bank Invalid");
      err.status = 400;
      throw err;
    }

    if (accountExist) {
      const err = new Error("Account already exists");
      err.status = 400;
      throw err;
    }

    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    const fullName = user?.firstName + " " + user?.lastName;
    console.log(fullName, "fullName");

    const dbName = normalizeName(fullName);
    const inputName = normalizeName(accountHolderName);

    console.log(dbName, "dbName");
    console.log(inputName, "inputName");

    const similarity = stringSimilarity.compareTwoStrings(dbName, inputName);

    console.log(similarity, "similarity score");

    // 0.8 = 80% similar (you can tune this)
    if (similarity < 0.8) {
      const err = new Error("Only user's own account allowed");
      err.status = 403;
      throw err;
    }

    const instantOutlet = await InstantAepsOutlet.findOne({
      userId: userId,
    })
      .select("aepsLimits aepsPayoutBanksAdded")
      .lean();

    if (!instantOutlet) {
      const err = new Error("Outlet not found");
      err.status = 404;
      throw err;
    }

    console.log(instantOutlet, "instantOutlet");

    if (
      instantOutlet?.aepsPayoutBanksAdded >=
      instantOutlet?.aepsLimits?.allowedBankLimits
    ) {
      const err = new Error(
        `Maximum account adding limit : ${instantOutlet?.aepsLimits?.allowedBankLimits}  `,
      );
      err.status = 400;
      throw err;
    }

    const aepsPayoutBank = await AepsPayoutBankRequest.create(
      [
        {
          userId,
          bankName: payoutBank?.bankName,
          payoutBankId: payoutBank?.bankId,
          accountHolderName,
          accountNumber,
          ifscCode,
          chequeUrl: `uploads/aepsPayoutCheque/${cheque}`,
        },
      ],
      { session: session },
    );

    await InstantAepsOutlet.findOneAndUpdate(
      {
        userId: userId,
      },
      { $inc: { aepsPayoutBanksAdded: 1 } },
      { session: session },
    );

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "AEPS payout bank request added successfully",
      data: aepsPayoutBank,
    });
  } catch (error) {
    await session.abortTransaction();

    next(error);
  } finally {
    session.endSession();
  }
};

exports.deleteAepsPayoutBank = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { id } = req.params;
    const userId = req.user.id;

    console.log(id, "id");
    console.log(userId, "userId");

    if (!id) {
      const err = new Error("Bank ID is required");
      err.status = 400;
      throw err;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error("Invalid Bank ID");
      err.status = 400;
      throw err;
    }

    const aepsPayoutBank = await AepsPayoutBankRequest.findOneAndUpdate(
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
        session: session,
      },
    );

    if (!aepsPayoutBank) {
      const err = new Error("AEPS payout bank not found");
      err.status = 404;
      throw err;
    }

    await InstantAepsOutlet.findOneAndUpdate(
      {
        userId: userId,
        aepsPayoutBanksAdded: { $gt: 0 },
      },
      { $inc: { aepsPayoutBanksAdded: -1 } },
      { session: session },
    );

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "AEPS payout bank deleted successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

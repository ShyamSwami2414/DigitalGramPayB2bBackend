const mongoose = require("mongoose");
const IdCharge = require("../../models/idChargeRequest");
const User = require("../../models/userModel");
const WalletTopupBank = require("../../models/walletTopupBankModel");
const { rupeeToPaise, paiseToRupee } = require("../../utils/money");
const {
  generateUniqueRefernceId,
} = require("../../utils/generateUniqueReferenceId");

exports.addIdChargeRequest = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    console.log(req.body, "body");
    console.log(req.file, "file");
    let { amount, mode, receiverBank, utrNumber, paymentDate } = req.body;
    amount = Number(amount);

    const referenceId = generateUniqueRefernceId("IDR");

    mode = mode?.trim()?.toLowerCase();
    utrNumber = utrNumber?.trim();

    const amountInPaise = rupeeToPaise(amount);

    const paymentProof = req?.file?.filename;

    const requiredFields = [
      "amount",
      "mode",
      "receiverBank",
      "utrNumber",
      "paymentDate",
    ];

    const missingFields = [];

    console.log(paymentProof);

    if (!req.file) {
      missingFields.push("paymentProof");
    }

    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    });

    if (missingFields.length > 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    if (!Number.isFinite(amount)) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Invalid amount" });
    }

    if (amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    if (new Date(paymentDate) > new Date()) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Payment date cannot be in the future",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverBank)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Invalid receiver bank ID",
      });
    }

    const receiverBankExist = await WalletTopupBank.findOne({
      _id: receiverBank,
      isDeleted: false,
      isActive: true,
    });

    if (!receiverBankExist) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Receiver bank not found or disabled",
      });
    }

    const isRequestExist = await IdCharge.findOne({
      userId: req.user.id,
      status: { $ne: "rejected" },
    });

    if (isRequestExist) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message:
          "Request already exist for this User waiting for further reviews",
      });
    }

    const IdChargeRequest = new IdCharge({
      userId: req.user.id,
      referenceId: referenceId,
      amount: amountInPaise,
      mode,
      walletTopupBankId: receiverBank,
      utrNumber,
      paymentDate,
      paymentProof: `/uploads/paymentProof/${paymentProof}`,
    });

    await IdChargeRequest.save({ session: session });

    await User.findOneAndUpdate(
      {
        _id: req.user.id,
        isActive: true,
        isDeleted: false,
      },
      {
        $set: {
          idPaymentStatus: "complete",
        },
      },
      { new: true, session: session },
    );

    console.log(IdChargeRequest, "plain");
    console.log(IdChargeRequest._doc, "spread");

    const formattedData = IdChargeRequest
      ? {
          ...IdChargeRequest._doc,
          amount: paiseToRupee(IdChargeRequest?.amount),
        }
      : null;

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "ID charges request added successfully",
      data: formattedData,
    });
  } catch (error) {
    if (session.inTransaction) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    session.endSession();
  }
};

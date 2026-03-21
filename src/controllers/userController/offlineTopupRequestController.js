const mongoose = require("mongoose");
const FundRequest = require("../../models/fundRequestModel");
const WalletTopupBank = require("../../models/walletTopupBankModel");
const { rupeeToPaise, paiseToRupee } = require("../../utils/money");

exports.getAllOfflineTopupRequests = async (req, res, next) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const filter = {
      userId: req.user.id,
    };

    const offlineTopupRequests = await FundRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await FundRequest.countDocuments(filter);

    const formattedData = offlineTopupRequests.map((item) => ({
      ...item,
      amount: paiseToRupee(item.amount),
    }));

    return res.status(200).json({
      success: true,
      message: "Offline topup requests fetched successfully",
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

exports.addOfflineTopupRequest = async (req, res, next) => {
  try {
    console.log(req.body, "body");
    let { amount, mode, receiverBank, utrNumber, paymentDate } = req.body;
    amount = Number(amount);

    mode = mode?.trim()?.toLowerCase();
    utrNumber = utrNumber?.trim();

    const amountInPaise = rupeeToPaise(amount);

    const paymentProof = req.file?.filename;
    const requiredFields = [
      "amount",
      "mode",
      "receiverBank",
      "utrNumber",
      "paymentDate",
    ];

    const missingFields = [];

    if (!paymentProof) {
      missingFields.push("paymentProof");
    }

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

    if (!Number.isFinite(amount)) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    if (new Date(paymentDate) > new Date()) {
      return res.status(400).json({
        message: "Payment date cannot be in the future",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverBank)) {
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
      return res.status(400).json({
        success: false,
        message: "Receiver bank not found or disabled",
      });
    }

    const offlineTopupRequest = new FundRequest({
      userId: req.user.id,
      amount: amountInPaise,
      mode,
      walletTopupBankId: receiverBank,
      utrNumber,
      paymentDate,
      paymentProof: `/uploads/paymentProof/${paymentProof}`,
    });

    await offlineTopupRequest.save();

    return res.status(201).json({
      success: true,
      message: "Offline topup request added successfully",
      data: offlineTopupRequest,
    });
  } catch (error) {
    next(error);
  }
};

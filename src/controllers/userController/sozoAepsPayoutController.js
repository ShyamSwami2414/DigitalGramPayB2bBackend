const {
  initiateAepsPayoutTransfer,
  checkAepsPayoutStatus,
} = require("../../services/sozoAepsPayout");
const { rupeeToPaise } = require("../../utils/money");
const mongoose = require("mongoose");
const AepsPayoutBankRequest = require("../../models/sozoAepsPayoutBankRequestModel");
const User = require("../../models/userModel");
const Kyc = require("../../models/kycModel");

exports.initiateAepsPayout = async (req, res, next) => {
  try {
    let { amount, longitude, latitude, bankId, purpose } = req.body;

    bankId = bankId?.trim();
    purpose = purpose?.trim();
    amount = Number(amount);
    latitude = Number(latitude);
    longitude = Number(longitude);

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "amount",
      "latitude",
      "longitude",
      "bankId",
      "purpose",
    ];

    const missingFields = [];

    requiredFields.forEach((field) => {
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

    if (isNaN(latitude) || isNaN(longitude)) {
      // Check NaN
      return res.status(400).json({
        success: false,
        message: "Latitude and Longitude must be valid numbers",
      });
    }

    // Range validation
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude (must be between -90 and 90)",
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid longitude (must be between -180 and 180)",
      });
    }

    if (amount < 10) {
      return res.status(400).json({
        success: false,
        message: "Minimum payout amount is 10 rupees",
      });
    }

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    const [user, bank, kyc] = await Promise.all([
      User.findOne({
        _id: userId,
        isActive: true,
        isDeleted: false,
      })
        .select("_id email phone ")
        .lean(),

      AepsPayoutBankRequest.findOne({
        _id: bankId,
        userId: userId,
        status: "approved",
        isActive: true,
        isDeleted: false,
      })
        .select(
          "payoutBankId bankName accountHolderName accountNumber ifscCode status",
        )
        .lean(),

      Kyc.findOne({ userId: userId, status: "approved" })
        .select("personalAddress")
        .lean(),
    ]);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not available or inactive",
      });
    }

    if (!bank) {
      return res.status(400).json({
        success: false,
        message: "Bank selected is not valid or not approved",
      });
    }

    if (!kyc) {
      return res.status(400).json({
        success: false,
        message: "Kyc not found or not approved",
      });
    }

    const address = [
      kyc?.personalAddress?.address,
      kyc?.personalAddress?.city,
      kyc?.personalAddress?.state,
      kyc?.personalAddress?.pincode,
    ]
      .filter(Boolean)
      .join(" ");

    const amountInPaise = rupeeToPaise(amount);

    const response = await initiateAepsPayoutTransfer({
      userId,
      requestId: idempotency,
      amount: amountInPaise,
      bankAccountNumber: bank?.accountNumber,
      ifsc: bank?.ifscCode,
      name: bank?.accountHolderName,
      email: user?.email,
      phone: user?.phone,
      bankProfileId: bank?.payoutBankId,
      address: address,
      latitude,
      longitude,
      purpose,
    });

    console.log(response, "response controller");

    if (
      response &&
      response.success === true &&
      (response?.data?.status === "PENDING" ||
        response?.data?.status === "SUCCESS")
    ) {
      const data = response?.data?.data;

      return res.status(200).json({
        success: true,
        message: response?.data?.message,
        data: {
          status: response?.data?.status,
          transactionId: data?.client_referenceId,
        },
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

exports.checkPayoutStatus = async (req, res, next) => {
  try {
    let { transactionId } = req.body;

    transactionId = transactionId?.trim();

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = ["transactionId"];

    const missingFields = [];

    requiredFields.forEach((field) => {
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

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    const response = await checkAepsPayoutStatus({
      userId,
      requestId: idempotency,
      transactionId: transactionId,
    });

    console.log(response, "response controller");

    if (response && response.success === true && response.code === 200) {
      const data = response?.data;

      return res.status(200).json({
        success: true,
        message: response?.message,
        data: {
          transactionId: data?.transaction_id,
          status: data?.status,
          amount: data?.amount,
        },
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

const mongoose = require("mongoose");
const { rupeeToPaise } = require("../../utils/money");
const {
  addBeneficiary,
  listBeneficiary,
  deleteBeneficiary,
} = require("../../services/nobleFinoDmtService");

const NobleDmtBeneficiary = require("../../models/nobleDmtBeneficiaryModel");

const getNobleDmtBeneficiary = async (req, res, next) => {
  try {
    let {
      mobile, //remitter customer
    } = req.body;

    mobile = mobile?.trim();

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = ["mobile"];

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

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid customer mobile number" });
    }

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    const response = await listBeneficiary({
      userId,
      requestId: idempotency,
      remitterMobile: mobile,
    });

    console.log(response, "response controller");

    if (
      response &&
      response?.data?.status === 1 &&
      response?.data?.statusCode === "SS0011"
    ) {
      const data = response?.data?.responseData;

      return res.status(201).json({
        success: true,
        message: response?.message,
        data: data,
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

const addNobleDmtBeneficiary = async (req, res, next) => {
  try {
    let {
      mobile, //remitter customer
      accountHolderName,
      accountNumber,
      ifsc,
      bankName,
      beneficiaryMobile,
    } = req.body;

    accountHolderName = accountHolderName?.trim();
    accountNumber = accountNumber?.trim();
    ifsc = ifsc?.trim();
    bankName = bankName?.trim();
    mobile = mobile?.trim();
    beneficiaryMobile = beneficiaryMobile?.trim();

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = [
      "accountHolderName",
      "accountNumber",
      "ifsc",
      "bankName",
      "mobile",
      "beneficiaryMobile",
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

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid customer mobile number" });
    }

    if (!mobileRegex.test(beneficiaryMobile)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Beneficiary mobile number" });
    }

    const nameRegex = /^[A-Za-z ]{2,50}$/;
    if (!nameRegex.test(accountHolderName)) {
      return "Invalid account holder name";
    }

    const accRegex = /^[0-9]{9,18}$/;
    if (!accRegex.test(accountNumber)) {
      return "Invalid account number";
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifsc)) {
      return "Invalid IFSC code";
    }

    const bankRegex = /^[A-Za-z ]{3,60}$/;
    if (!bankRegex.test(bankName)) {
      return "Invalid bank name";
    }

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    const isBeneficiaryAccountExist = await NobleDmtBeneficiary.findOne({
      accountNumber: accountNumber,
    });

    if (isBeneficiaryAccountExist) {
      return res.status(400).json({
        success: false,
        message: `Account already linked with this Remitter : ${isBeneficiaryAccountExist?.remitterMobile}`,
      });
    }

    const response = await addBeneficiary({
      userId,
      requestId: idempotency,
      accountHolderName,
      accountNumber,
      ifsc,
      bankName,
      remitterMobile: mobile,
      beneficiaryMobile: beneficiaryMobile,
    });

    console.log(response, "response controller");

    if (
      response &&
      response?.data?.status === 1 &&
      response?.data?.statusCode === "SS0011"
    ) {
      const data = response?.data?.responseData?.[0];

      await NobleDmtBeneficiary.create([
        {
          userId: userId,
          remitterMobile: data?.mobile,
          bankName: bankName,
          ifsc: ifsc,
          accountHolderName: accountHolderName,
          accountNumber: data?.account_no,
          beneficiaryMobile: beneficiaryMobile,
        },
      ]);

      return res.status(201).json({
        success: true,
        message: response?.message,
        data: data,
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

const deleteNobleDmtBeneficiary = async (req, res, next) => {
  try {
    let {
      mobile, //remitter customer
      accountNumber,
      ifsc,
    } = req.body;

    accountNumber = accountNumber?.trim();
    ifsc = ifsc?.trim();
    mobile = mobile?.trim();

    const userId = req.user.id;
    const idempotency = req.headers["idempotency-key"];

    const requiredFields = ["accountNumber", "ifsc", "mobile"];

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

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid customer mobile number" });
    }

    const accRegex = /^[0-9]{9,18}$/;
    if (!accRegex.test(accountNumber)) {
      return "Invalid account number";
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifsc)) {
      return "Invalid IFSC code";
    }

    if (!idempotency) {
      return res.status(400).json({
        success: false,
        message: "Invalid Request ID",
      });
    }

    const response = await deleteBeneficiary({
      userId,
      requestId: idempotency,
      remitterMobile: mobile,
      accountNumber,
      ifsc,
    });

    console.log(response, "response controller");

    if (
      response &&
      response?.data?.status === 1 &&
      response?.data?.statusCode === "SS0011"
    ) {
      const data = response?.data?.responseData?.[0];

      await NobleDmtBeneficiary.findOneAndDelete({
        mobile: mobile,
        accountNumber: accountNumber,
      });

      return res.status(200).json({
        success: true,
        message: response?.message,
      });
    } else {
      throw Error(response?.message || response?.data?.message);
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNobleDmtBeneficiary,
  addNobleDmtBeneficiary,
  deleteNobleDmtBeneficiary,
};

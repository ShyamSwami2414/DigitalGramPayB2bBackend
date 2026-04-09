const mongoose = require("mongoose");
const EkoOnboardAepsUser = require("../models/ekoAepsOnboardUserModel");
const User = require("../models/userModel");

const {
  generateUniqueRefernceId,
} = require("../utils/generateUniqueReferenceId");

const { debitWallet } = require("./common/walletService");
const { processRefund } = require("./common/refundService");

const { encryptAadhaar } = require("../helpers/encryptDecryptAadhar");
const { aepsOnboard } = require("../client/cspl/apis/aeps/eko/aepsOnboard");

const {
  activateAepsService,
} = require("../client/cspl/apis/aeps/eko/activateAepsService");

exports.onboardEkoAepsUser = async ({
  userId,
  requestId,
  mobile,
  panNumber,
  firstName,
  lastName,
  email,
  dateOfBirth,
  shopName,
  address,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();
    const registrationCharges = 1000;

    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: registrationCharges, //paise
      serviceType: "AEPS",
      referenceId: referenceId,
      description: "Aeps User Onboard Charges",
      session: session,
    });

    await session.commitTransaction();

    let result;

    try {
      result = await aepsOnboard({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        mobile,
        panNumber,
        firstName,
        lastName,
        email,
        dateOfBirth,
        shopName,
        address,
      });
    } catch (error) {
      result = {
        status: false,
        message:
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log(
      "aeps eko onboard user service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status);

    if (result?.status === false || result?.data?.response_type_id !== 1290) {
      console.log("Entered Error Dealing block");
      const { openingBalance, closingBalance } = await processRefund({
        userId: userId,
        amount: registrationCharges, //paise
        referenceId: referenceId,
        description: "User Onboard Failed, Charges Refunded",
        apiResponse: result,
      });
    }

    if (
      result?.status === "FAILED" ||
      result?.status === false ||
      result?.data?.response_type_id !== 1290
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    throw error;
  }
};

exports.activateService = async ({
  userId,
  requestId,
  address,
  officeAddress,
  bank,
  ifsc,
  accountNumber,
  aadhaar,
  latitude,
  longitude,
  deviceNumber,
  modelName,
  aadhaarFrontFile,
  aadhaarBackFile,
  panFile,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();
    const registrationCharges = 1000;

    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: registrationCharges, //paise
      serviceType: "AEPS",
      referenceId: referenceId,
      description: "Aeps User Onboard Charges",
      session: session,
    });

    const onboardMerchant = await EkoOnboardAepsUser.findOne({
      userId: userId,
    })
      .select("_id userCode initiatorId")
      .lean()
      .session(session);

    if (!onboardMerchant) {
      const err = new Error("User not onboarded yet, first register yourself");
      err.statusCode = 404;
      throw err;
    }

    await session.commitTransaction();

    let result;

    try {
      result = await activateAepsService({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        userCode: onboardMerchant?.userCode,
        initiatorId: onboardMerchant?.initiatorId,
        address,
        officeAddress,
        bank,
        ifsc,
        accountNumber,
        aadhaar,
        latitude,
        longitude,
        deviceNumber,
        modelName,
        aadhaarFrontFile,
        aadhaarBackFile,
        panFile,
      });
    } catch (error) {
      result = {
        status: false,
        message:
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log(
      "aeps eko onboard user service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status);

    if (result?.status === false || result?.data?.response_type_id !== 1290) {
      console.log("Entered Error Dealing block");
      const { openingBalance, closingBalance } = await processRefund({
        userId: userId,
        amount: registrationCharges, //paise
        referenceId: referenceId,
        description: "User Onboard Failed, Charges Refunded",
        apiResponse: result,
      });
    }

    if (
      result?.status === "FAILED" ||
      result?.status === false ||
      result?.data?.response_type_id !== 1290
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    throw error;
  }
};

const mongoose = require("mongoose");
const EkoOnboardAepsUser = require("../models/ekoAepsOnboardUserModel");
const EkoAepsReport = require("../models/ekoAepsReportModel");
const DailyEkoAepsLogin = require("../models/dailyEkoAepsLoginModel");
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
const {
  ekycOtpGenerate,
} = require("../client/cspl/apis/aeps/eko/ekycOtpGenerate");
const { ekycOtpVerify } = require("../client/cspl/apis/aeps/eko/verifyEkycOtp");
const { ekycBiometric } = require("../client/cspl/apis/aeps/eko/ekycBiometric");
const {
  aepsTransaction,
} = require("../client/cspl/apis/aeps/eko/aepsTransaction");
const { dailyEkoLogin } = require("../client/cspl/apis/aeps/eko/dailyLogin");

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

    if (
      result?.status === false ||
      (result?.data?.response_type_id !== 1290 &&
        result?.data?.response_type_id !== 1307)
    ) {
      console.log("Entered Error Dealing block");
      const { openingBalance, closingBalance } = await processRefund({
        userId: userId,
        amount: registrationCharges, //paise
        referenceId: referenceId,
        walletType: "main",
        description: "User Onboard Failed, Charges Refunded",
        apiResponse: result,
      });
    }

    if (
      result?.status === "FAILED" ||
      result?.status === false ||
      (result?.data?.response_type_id !== 1290 &&
        result?.data?.response_type_id !== 1307)
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
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
          error.error ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log(
      "aeps eko activate user service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status);

    if (
      result?.status === "FAILED" ||
      result?.http_code !== 200 ||
      (result?.data?.service_status_desc !== "Pending" &&
        result?.data?.service_status_desc !== "Activated")
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
};

exports.kycOtp = async ({
  userId,
  requestId,
  aadhaar,
  latitude,
  longitude,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    const onboardMerchant = await EkoOnboardAepsUser.findOne({
      userId: userId,
    })
      .select("_id userCode initiatorId mobile")
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
      result = await ekycOtpGenerate({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        userCode: onboardMerchant?.userCode,
        mobile: onboardMerchant?.mobile,
        aadhaar,
        latitude,
        longitude,
      });
    } catch (error) {
      result = {
        status: false,
        reason: error?.reason,
        message:
          error?.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log("aeps eko ekyc otp service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status);

    if (
      result?.status === "FAILED" ||
      result?.status === false ||
      result?.http_code !== 200
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
};

exports.verifyOtp = async ({ userId, requestId, otp, latitude, longitude }) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    const onboardMerchant = await EkoOnboardAepsUser.findOne({
      userId: userId,
    })
      .select(
        "_id userCode aadhaar initiatorId mobile temp_otp_ref_id temp_reference_tid",
      )
      .lean()
      .session(session);

    if (!onboardMerchant) {
      const err = new Error("User not onboarded yet, first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(onboardMerchant, "onboardMerchant");
    await session.commitTransaction();

    let result;

    try {
      result = await ekycOtpVerify({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        initiatorId: onboardMerchant?.initiatorId,
        userCode: onboardMerchant?.userCode,
        mobile: onboardMerchant?.mobile,
        otp,
        latitude,
        longitude,
        otpRefId: onboardMerchant?.temp_otp_ref_id,
        referenceTid: onboardMerchant?.temp_reference_tid,
        aadhaar: onboardMerchant?.aadhaar,
      });
    } catch (error) {
      result = {
        status: false,
        reason: error?.reason,
        message:
          error?.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log("aeps eko verify otp service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status);

    if (
      result?.status === "FAILED" ||
      result?.status === false ||
      result?.http_code !== 200
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
};

exports.ekycBiometric = async ({
  userId,
  requestId,
  latitude,
  longitude,
  pidData,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    const onboardMerchant = await EkoOnboardAepsUser.findOne({
      userId: userId,
    })
      .select(
        "_id initiatorId userCode aadhaar bank mobile temp_otp_ref_id temp_reference_tid",
      )
      .lean()
      .session(session);

    if (!onboardMerchant) {
      const err = new Error("User not onboarded yet, first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(onboardMerchant, "onboardMerchant");
    await session.commitTransaction();

    let result;

    try {
      result = await ekycBiometric({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        mobile: onboardMerchant?.mobile,
        aadhaar: onboardMerchant?.aadhaar,
        userCode: onboardMerchant?.userCode,
        initiatorId: onboardMerchant?.initiatorId,
        latitude,
        longitude,
        bankCode: onboardMerchant?.bank,
        otpRefId: onboardMerchant?.temp_otp_ref_id,
        referenceTid: onboardMerchant?.temp_reference_tid,
        pidData: pidData,
      });
    } catch (error) {
      result = {
        status: false,
        reason: error?.reason,
        message:
          error?.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log(
      "aeps eko ekyc biometric service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status);

    if (
      result?.status === "FAILED" ||
      result?.status === false ||
      result?.http_code !== 200
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
};

exports.dailyBiometricLogin = async ({
  userId,
  requestId,
  latitude,
  longitude,
  pidData,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    const dailyAepsLoginCharge = 100;

    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: dailyAepsLoginCharge, //paise
      serviceType: "AEPS",
      referenceId: referenceId,
      description: "Aeps Eko Daily Login Charges",
      session: session,
    });

    const onboardMerchant = await EkoOnboardAepsUser.findOne({
      userId: userId,
    })
      .select("_id initiatorId userCode aadhaar bank mobile")
      .lean()
      .session(session);

    if (!onboardMerchant) {
      const err = new Error("User not onboarded yet, first register yourself");
      err.statusCode = 404;
      throw err;
    }

    await DailyEkoAepsLogin.create(
      [
        {
          referenceId: referenceId,
          userId: userId,
          userCode: onboardMerchant?.userCode,
          loginDate: Date.now(),
          status: "PENDING",
        },
      ],
      { session: session },
    );

    console.log(onboardMerchant, "onboardMerchant");
    await session.commitTransaction();

    let result;

    try {
      result = await dailyEkoLogin({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        mobile: onboardMerchant?.mobile,
        aadhaar: onboardMerchant?.aadhaar,
        userCode: onboardMerchant?.userCode,
        latitude,
        longitude,
        bankCode: onboardMerchant?.bank,
        pidData: pidData,
      });
    } catch (error) {
      result = {
        status: false,
        reason: error?.reason,
        message:
          error?.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log(
      "aeps eko daily login service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status);

    if (
      result?.status === true &&
      result?.http_code === 200 &&
      result?.data?.response_status_id === 0 &&
      result?.data?.status === 0
    ) {
      await DailyEkoAepsLogin.updateOne(
        { referenceId },
        {
          $set: {
            status: "SUCCESS",
            lastLoginAt: Date.now(),
          },
        },
      );

      await EkoOnboardAepsUser.updateOne(
        { userId },
        {
          $set: {
            lastLoginAt: new Date(),
            isLoginRequired: false,
          },
        },
      );
    } else if (
      result?.status === "ERROR" ||
      result?.status === "FAILED" ||
      result?.status === false ||
      result?.http_code !== 200
    ) {
      const refundSession = await mongoose.startSession();
      try {
        refundSession.startTransaction();

        await processRefund({
          userId: userId,
          amount: dailyAepsLoginCharge,
          referenceId: referenceId,
          walletType: "main",
          description: `Refund: Daily Eko Login Failed `,
          session: refundSession,
        });

        await DailyEkoAepsLogin.updateOne(
          { referenceId },
          { $set: { status: "REFUNDED" } },
          { session: refundSession },
        );

        await refundSession.commitTransaction();
      } catch (refundError) {
        if (refundSession.inTransaction()) {
          await refundSession.abortTransaction();
        }
        console.error(" Refund Sync Failed", refundError);
      } finally {
        refundSession.endSession();
      }

      const err = new Error(result?.message || "API Failed");
      err.statusCode = 400;
      err.data = result?.data;
      throw err;
    }

    if (
      result?.status === "FAILED" ||
      result?.status === false ||
      result?.http_code !== 200
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
};

exports.initiateAepsTransaction = async ({
  userId,
  requestId,
  latitude,
  longitude,
  pidData,
  serviceType,
  sourceIp,
  amount, //paise
  serviceTypeName,
  bankCode,
  aadhaar,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    const onboardMerchant = await EkoOnboardAepsUser.findOne({
      userId: userId,
    })
      .select(
        "_id userCode initiatorId aadhaar mobile temp_otp_ref_id temp_reference_tid",
      )
      .lean()
      .session(session);

    if (!onboardMerchant) {
      const err = new Error("User not onboarded yet, first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(onboardMerchant, "onboardMerchant");

    await EkoAepsReport.create(
      [
        {
          userId: userId,
          userCode: onboardMerchant?.userCode,
          serviceType: `${serviceTypeName}`,
          providerName: "EKO",
          referenceId: referenceId,
          txnStatus: "PENDING",
          amount: amount, //paise
        },
      ],
      { session: session },
    );

    await session.commitTransaction();

    let result;

    try {
      result = await aepsTransaction({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        serviceType: serviceType,
        initiatorId: onboardMerchant?.initiatorId,
        userCode: onboardMerchant?.userCode,
        mobile: onboardMerchant?.mobile,
        aadhaar: aadhaar,
        latitude,
        longitude,
        sourceIp: sourceIp,
        amount: amount,
        bankCode: bankCode,
        otpRefId: onboardMerchant?.temp_otp_ref_id,
        referenceTid: onboardMerchant?.temp_reference_tid,
        pidData: pidData,
        serviceTypeName,
      });
    } catch (error) {
      result = {
        status: false,
        reason: error?.comment,
        message:
          error?.comment ||
          error?.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log(
      "aeps eko initiate transaction service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status);

    if (
      result?.status === true &&
      result?.txn_status === "success" &&
      result?.data?.response_status_id === 0 &&
      result?.data?.status === 0
    ) {
      const data = result?.data?.data;
      try {
        await EkoAepsReport.findOneAndUpdate(
          { referenceId: referenceId },
          {
            $set: {
              txnStatus: "SUCCESS",
              providerTxnId: data?.tid,
              balance: data?.customer_balance,
              miniStatement: data?.mini_statement_list,
              aadhaar: data?.aadhar,
              message: result?.data?.message,
              reason: data?.comment,
              rawResponse: result,
            },
          },
        );

        console.log(result);
        return {
          ...result,
          referenceId: referenceId,
        };
      } catch (error) {
        throw error;
      }
    } else {
      try {
        const data = result?.data?.data;
        await EkoAepsReport.findOneAndUpdate(
          { referenceId: referenceId },
          {
            $set: {
              txnStatus: "FAILED",
              providerTxnId: data?.tid,
              accountBalance: data?.customer_balance,
              bankName: data?.bankName,
              aadhaar: data?.aadhar,
              message: result?.data?.message,
              reason: data?.comment,
              rawResponse: result,
            },
          },
        );
      } catch (error) {
        throw result;
      }
    }

    console.log(result);
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
};

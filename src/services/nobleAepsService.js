const { generateAgentCode } = require("../utils/generateNobleAepsAgentCode");
const mongoose = require("mongoose");
const {
  generateUniqueRefernceId,
} = require("../utils/generateUniqueReferenceId");
const { debitWallet } = require("./common/walletService");
const { agentOnboard } = require("../client/cspl/apis/aeps/noble/agentOnboard");
const { processRefund } = require("./common/refundService");
const NobleAepsState = require("../models/nobleAepsStateModel");
const NobleAepsAgent = require("../models/nobleAepsAgentModel");
const { loadAgent } = require("../client/cspl/apis/aeps/noble/loadAgent");
const { kyc } = require("../client/cspl/apis/aeps/noble/biometricKyc");
const { dailyLogin } = require("../client/cspl/apis/aeps/noble/dailyLogin");

exports.nobleAepsOnboardAgent = async ({
  userId,
  requestId,
  channel,
  ipAddress,

  firstName,
  middleName,
  lastName,
  email,
  mobileNumber,

  aadhaar,
  panNumber,
  dob,

  address,
  state,
  city,
  pincode,
  bankName,
  bankAccountNumber,
  bankIfsc,
  shopName,
  shopAddress,
  shopState,
  shopCity,
  shopPincode,
  shopLongitude,
  shopLatitude,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId("NAE");
    const registrationCharges = 1000;
    // const encryptedAadhaar = encryptAadhaar(aadhaar);

    const agentCode = await generateAgentCode();

    console.log(agentCode, "agentCode");
    console.log(typeof agentCode, "agentCode type");

    const [agentStateCode, shopStateCode] = await Promise.all([
      NobleAepsState.findOne({ _id: state }).select("stateCode").lean(),

      NobleAepsState.findOne({ _id: shopState }).select("stateCode").lean(),
    ]);

    // Validation
    if (!agentStateCode) {
      const err = new Error("Agent state not found");
      err.statusCode = 404;
      throw err;
    }

    if (!shopStateCode) {
      const err = new Error("Shop state not found");
      err.statusCode = 404;
      throw err;
    }

    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: registrationCharges, //paise
      serviceType: "AEPS",
      serviceCategory: "ONE_TIME_CHARGES",
      referenceId: referenceId,
      description: "Aeps Registration Charges",
      session: session,
    });

    await session.commitTransaction();

    let result;

    try {
      result = await agentOnboard({
        client_referenceId: referenceId, //auto genertae
        userId,
        agentCode: agentCode,
        requestId,
        channel,
        ipAddress,

        firstName,
        middleName,
        lastName,
        email,
        mobileNumber,

        aadhaar,
        panNumber,
        dob,

        address,
        agentStateCode: agentStateCode.stateCode,
        city,
        pincode,
        bankName,
        bankAccountNumber,
        bankIfsc,
        shopName,
        shopAddress,
        shopStateCode: shopStateCode.stateCode,
        shopCity,
        shopPincode,
        shopLongitude,
        shopLatitude,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        // data: error?.response?.data || null,
      };
    }

    console.log(
      "aeps agent onboard registration service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.data?.statusCode || result?.data?.status);

    if (result?.status === "FAILED" || result?.data?.statusCode !== "AG0001") {
      console.log("Entered");
      const { openingBalance, closingBalance } = await processRefund({
        userId: userId,
        amount: registrationCharges, //paise
        serviceType: "AEPS",
        serviceCategory: "ONE_TIME_CHARGES",
        referenceId: referenceId,
        walletType: "main",
        description: "Agent Register Failed, Charges Refunded",
        apiResponse: result,
      });
    }

    if (
      result?.status === "FAILED" ||
      result?.status === "ERROR" ||
      result?.data?.statusCode !== "AG00001" ||
      result?.data?.statusCode !== "AG0001"
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    throw error;
  }
};

exports.loadAepsAgent = async ({ userId, requestId }) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId("NAE");

    const agentExist = await NobleAepsAgent.findOne({ userId: userId })
      .select("_id uniqueAgentId")
      .lean()
      .session(session);

    if (!agentExist) {
      const err = new Error("User not registered, first onboard yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(agentExist, "agentExist");

    await session.commitTransaction();

    let result;

    try {
      result = await loadAgent({
        client_referenceId: referenceId, //auto genertae
        userId: userId,
        requestId, //client send idempotency
        uniqueAgentId: agentExist?.uniqueAgentId,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log(" status cheeck service", JSON.stringify(result, null, 2));

    console.log("Status", result?.data?.statusCode || result?.data?.status);

    if (result?.data?.statusCode === "AG0001") {
      const successSession = await mongoose.startSession();
      try {
        console.log("entered success data");
        successSession.startTransaction();

        const data = result?.data?.responseData?.[0];
        console.log(data, "data");
        console.log(data?.kycRequired, "kycRequired");
        console.log(data?.Daily2fa_AEPS_Required, "is2faLoginRequired");

        const isKycStatusApproved = data?.kycRequired === "YES";
        const is2faLoginRequired = data?.Daily2fa_AEPS_Required === "YES";

        console.log(isKycStatusApproved, "isKycStatusApproved");

        const agentUpdate = await NobleAepsAgent.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(userId) },
          {
            $set: {
              isAepsEnabled: isKycStatusApproved ? true : false,
              isLoginRequired: is2faLoginRequired ? true : false,
            },
          },
          { new: true, session: successSession },
        );

        if (!agentUpdate) {
          const err = new Error("Merchant not exist");
          err.statusCode = 404;
          throw err;
        }

        await successSession.commitTransaction();
      } catch (error) {
        console.log(error, "check  sttaus updation error in session");

        if (successSession.inTransaction()) {
          await successSession.abortTransaction();
        }
      } finally {
        successSession.endSession();
      }
    } else if (
      result?.data?.statusCode !== "AG0001" ||
      result?.status === "FAILED" ||
      result?.status === "ERROR"
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    throw error;
  }
};

exports.biometricKyc = async ({
  userId,
  requestId,
  latitude,
  longitude,
  bioType,
  pidData,
  bussinessNature,
  annualIncome,
  channel,
  ipAddress,
  userAgent,
  mobileDeviceId,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId("NAE"); //backend unique

    const bioTypeMap = {
      FINGER: 0,
      FACE: 1,
      IRIS: 2,
    };

    const bioTypeCode = bioTypeMap[bioType];

    console.log(bioTypeCode);

    const agentExist = await NobleAepsAgent.findOne({ userId: userId })
      .select("_id uniqueAgentId")
      .lean()
      .session(session);

    if (!agentExist) {
      const err = new Error("Merchant not onboarded , first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(agentExist, "agentExist");

    await session.commitTransaction();

    let result;

    try {
      result = await kyc({
        userId: userId,
        requestId: requestId, //client send idempotency
        transactionId: referenceId, //auto genertae
        uniqueAgentId: agentExist?.uniqueAgentId,
        latitude,
        longitude,
        bioType: bioTypeCode, //code 0, 1, 2 etc
        pidData,
        bussinessNature,
        annualIncome,
        channel,
        ipAddress,
        userAgent,
        mobileDeviceId,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log(
      "new aepsbiometric kyc service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.stateCode || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.status === "ERROR" ||
      result?.statusCode !== "AG0001"
    ) {
      const err = new Error(result?.message || "API Failed");
      err.statusCode = 400;
      err.data = result?.data;
      throw err;
    }

    console.log(result, "result");
    return result;
  } catch (error) {
    throw error;
  }
};

exports.loadAepsAgent = async ({ userId, requestId }) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId("NAE");

    const agentExist = await NobleAepsAgent.findOne({ userId: userId })
      .select("_id uniqueAgentId")
      .lean()
      .session(session);

    if (!agentExist) {
      const err = new Error("User not registered, first onboard yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(agentExist, "agentExist");

    await session.commitTransaction();

    let result;

    try {
      result = await loadAgent({
        client_referenceId: referenceId, //auto genertae
        userId: userId,
        requestId, //client send idempotency
        uniqueAgentId: agentExist?.uniqueAgentId,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log(" status cheeck service", JSON.stringify(result, null, 2));

    console.log("Status", result?.data?.statusCode || result?.data?.status);

    if (result?.data?.statusCode === "AG0001") {
      const successSession = await mongoose.startSession();
      try {
        console.log("entered success data");
        successSession.startTransaction();

        const data = result?.data?.responseData?.[0];
        console.log(data, "data");
        console.log(data?.kycRequired, "kycRequired");
        console.log(data?.Daily2fa_AEPS_Required, "is2faLoginRequired");

        const isKycStatusApproved = data?.kycRequired === "YES";
        const is2faLoginRequired = data?.Daily2fa_AEPS_Required === "YES";

        console.log(isKycStatusApproved, "isKycStatusApproved");

        const agentUpdate = await NobleAepsAgent.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(userId) },
          {
            $set: {
              isAepsEnabled: isKycStatusApproved ? true : false,
              isLoginRequired: is2faLoginRequired ? true : false,
            },
          },
          { new: true, session: successSession },
        );

        if (!agentUpdate) {
          const err = new Error("Merchant not exist");
          err.statusCode = 404;
          throw err;
        }

        await successSession.commitTransaction();
      } catch (error) {
        console.log(error, "check  sttaus updation error in session");

        if (successSession.inTransaction()) {
          await successSession.abortTransaction();
        }
      } finally {
        successSession.endSession();
      }
    } else if (
      result?.data?.statusCode !== "AG0001" ||
      result?.status === "FAILED" ||
      result?.status === "ERROR"
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    throw error;
  }
};

exports.daily2faLogin = async ({
  userId,
  requestId,
  latitude,
  longitude,
  bioType,
  pidData,
  channel,
  ipAddress,
  userAgent,
  mobileDeviceId,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId("NAE"); //backend unique

    const dailyLoginCharges = 100; //paise
    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: dailyLoginCharges, //paise
      serviceType: "AEPS",
      serviceCategory: "DAILY_LOGIN_CHARGES",
      referenceId: referenceId,
      description: "Daily 2fa charges",
      session: session,
    });

    const bioTypeMap = {
      FINGER: 0,
      FACE: 1,
      IRIS: 2,
    };

    const bioTypeCode = bioTypeMap[bioType];

    console.log(bioTypeCode);

    const agentExist = await NobleAepsAgent.findOne({ userId: userId })
      .select("_id uniqueAgentId")
      .lean()
      .session(session);

    if (!agentExist) {
      const err = new Error("Merchant not onboarded , first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(agentExist, "agentExist");

    await session.commitTransaction();

    let result;

    try {
      result = await dailyLogin({
        userId: userId,
        requestId: requestId, //client send idempotency
        transactionId: referenceId, //auto genertae
        uniqueAgentId: agentExist?.uniqueAgentId,
        latitude,
        longitude,
        bioType,
        pidData,
        channel,
        ipAddress,
        userAgent,
        mobileDeviceId,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        data: error?.response?.data || null,
      };
    }

    console.log(
      "new aepsbiometric kyc service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.stateCode || result?.status);

    if (result?.status === "FAILED" || result?.data?.statusCode !== "AG0001") {
      console.log("Entered");
      const { openingBalance, closingBalance } = await processRefund({
        userId: userId,

        amount: dailyLoginCharges, //paise
        serviceType: "AEPS",
        serviceCategory: "DAILY_LOGIN_CHARGES",

        referenceId: referenceId,
        walletType: "main",
        description: "Daily 2fa Failed, Charges Refunded",
        apiResponse: result,
      });
    }

    if (
      result?.status === "FAILED" ||
      result?.status === "ERROR" ||
      result?.data?.statusCode !== "AG00001"
    ) {
      throw result;
    }

    console.log(result, "result");
    return result;
  } catch (error) {
    throw error;
  }
};

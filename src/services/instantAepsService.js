const mongoose = require("mongoose");
const Merchant = require("../models/instantAepsOutletModel");
const {
  generateUniqueRefernceId,
} = require("../utils/generateUniqueReferenceId");

const { debitWallet } = require("./common/walletService");
const { processRefund } = require("./common/refundService");
const { rupeeToPaise, paiseToRupee } = require("../utils/money");
const {
  outletRegister,
} = require("../client/cspl/apis/aeps/instant/outletRegister");

const {
  biometricKycStatus,
} = require("../client/cspl/apis/aeps/instant/biometricKycStatus");

const {
  biometricKyc,
} = require("../client/cspl/apis/aeps/instant/biometricKyc");

const { encryptAadhaar } = require("../helpers/encryptDecryptAadhar");
const {
  dailyLogin,
} = require("../client/cspl/apis/aeps/instant/dailyAepsLogin");
const {
  balanceEnquiry,
} = require("../client/cspl/apis/aeps/instant/balanceEnquiry");
const {
  miniStatement,
} = require("../client/cspl/apis/aeps/instant/miniStatement");

exports.instantAepsOutletRegister = async ({
  userId,
  requestId,
  name,
  email,
  mobile,
  aadhaar,
  longitude,
  latitude,
  pan,
  dateOfBirth,
  gender,
  address,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();
    const registrationCharges = 1000;
    const encryptedAadhaar = encryptAadhaar(aadhaar);

    const { openingBalance, closingBalance } = await debitWallet({
      userId: userId,
      amount: registrationCharges, //paise
      serviceType: "AEPS",
      referenceId: referenceId,
      description: "Aeps Outlet Registration Charges",
      session: session,
    });

    await session.commitTransaction();

    let result;

    try {
      result = await outletRegister({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        name,
        email,
        mobile,
        aadhaar: encryptedAadhaar,
        longitude,
        latitude,
        pan,
        dateOfBirth,
        gender,
        address,
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
      "aeps outlet registration service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status_code || result?.status);

    if (result?.status === "FAILED" || result?.status_code === "ERR") {
      console.log("Entered");
      const { openingBalance, closingBalance } = await processRefund({
        userId: userId,
        amount: registrationCharges, //paise
        referenceId: referenceId,
        description: "Outlet Register Failed, Charges Refunded",
        apiResponse: result,
      });
    }

    if (
      result?.status === "FAILED" ||
      result?.status === "ERROR" ||
      result?.status_code !== "TXN"
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    throw error;
  }
};

exports.checkBiometricKycStatus = async ({ userId, requestId }) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();
    const spKey = "WAP";

    const merchantExist = await Merchant.findOne({ userId: userId })
      .select("_id outletId")
      .lean()
      .session(session);

    if (!merchantExist) {
      const err = new Error("Merchant not registered, first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(merchantExist, "merchantExist");

    await session.commitTransaction();

    let result;

    try {
      result = await biometricKycStatus({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        spKey: spKey,
        mcode: merchantExist?.outletId,
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
      "aepsbiometric status service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.status_code === "ERR" ||
      result?.status === "ERROR" ||
      result?.status_code !== "TXN"
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
  captureType,
  biometricData,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId(); //backend unique

    const merchantExist = await Merchant.findOne({ userId: userId })
      .select("_id outletId temp_ref ")
      .lean()
      .session(session);

    if (!merchantExist) {
      const err = new Error("Merchant not registered, first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(merchantExist, "merchantExist");

    await session.commitTransaction();

    let result;

    try {
      result = await biometricKyc({
        userId,
        requestId, //client send idempotency
        client_referenceId: referenceId, //auto genertae
        referenceKey: merchantExist?.temp_ref,
        mcode: merchantExist?.outletId,
        latitude,
        longitude,
        captureType,
        biometricData,
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

    console.log("aepsbiometric kyc service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.status_code === "ERR" ||
      result?.status === "ERROR" ||
      result?.status_code !== "TXN"
    ) {
      const err = new Error(result.message || "API Failed");
      err.statusCode = 400;
      err.data = result.data;
      throw err;
    }

    console.log(result, "result");
    return result;
  } catch (error) {
    throw error;
  }
};

exports.dailyLogin = async ({
  userId,
  requestId,
  latitude,
  longitude,
  captureType,
  biometricData,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId(); //backend unique

    const merchantExist = await Merchant.findOne({ userId: userId })
      .select("_id outletId")
      .lean()
      .session(session);

    if (!merchantExist) {
      const err = new Error("Merchant not registered, first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(merchantExist, "merchantExist");

    await session.commitTransaction();

    let result;

    try {
      result = await dailyLogin({
        userId,
        requestId, //client send idempotency
        client_referenceId: referenceId, //auto genertae
        mcode: merchantExist?.outletId,
        latitude,
        longitude,
        captureType,
        biometricData,
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

    console.log("daily login service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.status_code === "ERR" ||
      result?.status === "ERROR" ||
      result?.status_code !== "TXN"
    ) {
      const err = new Error(result.message || "API Failed");
      err.statusCode = 400;
      err.data = result.data;
      throw err;
    }

    console.log(result, "result");
    return result;
  } catch (error) {
    throw error;
  }
};

exports.doBalanceEnquiry = async ({
  userId,
  requestId,
  mobile,
  iin,
  latitude,
  longitude,
  captureType,
  biometricData,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId(); //backend unique

    const merchantExist = await Merchant.findOne({ userId: userId })
      .select("_id outletId")
      .lean()
      .session(session);

    if (!merchantExist) {
      const err = new Error("Merchant not registered, first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(merchantExist, "merchantExist");

    await session.commitTransaction();

    let result;

    try {
      result = await balanceEnquiry({
        userId,
        requestId, //client send idempotency
        client_referenceId: referenceId, //auto genertae
        mcode: merchantExist?.outletId,
        mobile,
        bankiin: iin,
        latitude,
        longitude,
        captureType,
        biometricData,
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

    console.log("Balnce Enquiry Service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.status_code === "ERR" ||
      result?.status === "ERROR" ||
      result?.status_code !== "TXN"
    ) {
      const err = new Error(result.message || "API Failed");
      err.statusCode = 400;
      err.data = result.data;
      throw err;
    }

    console.log(result, "result");
    return result;
  } catch (error) {
    throw error;
  }
};

exports.doMiniStatement = async ({
  userId,
  requestId,
  mobile,
  iin,
  latitude,
  longitude,
  captureType,
  biometricData,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId(); //backend unique

    const merchantExist = await Merchant.findOne({ userId: userId })
      .select("_id outletId")
      .lean()
      .session(session);

    if (!merchantExist) {
      const err = new Error("Merchant not registered, first register yourself");
      err.statusCode = 404;
      throw err;
    }

    console.log(merchantExist, "merchantExist");

    await session.commitTransaction();

    let result;

    try {
      result = await miniStatement({
        userId,
        requestId, //client send idempotency
        client_referenceId: referenceId, //auto genertae
        mcode: merchantExist?.outletId,
        mobile,
        bankiin: iin,
        latitude,
        longitude,
        captureType,
        biometricData,
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

    console.log("Mini Statement Service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.status_code === "ERR" ||
      result?.status === "ERROR" ||
      result?.status_code !== "TXN"
    ) {
      const err = new Error(result.message || "API Failed");
      err.statusCode = 400;
      err.data = result.data;
      throw err;
    }

    console.log(result, "result");
    return result;
  } catch (error) {
    throw error;
  }
};

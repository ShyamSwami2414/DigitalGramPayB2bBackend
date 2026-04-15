const mongoose = require("mongoose");
const User = require("../models/userModel");
const {
  generateUniqueRefernceId,
} = require("../utils/generateUniqueReferenceId");

const { debitWallet, creditWallet } = require("./common/walletService");
const { processRefund } = require("./common/refundService");
const { rupeeToPaise, paiseToRupee } = require("../utils/money");

const { encryptAadhaar } = require("../helpers/encryptDecryptAadhar");
const {
  searchCustomer,
} = require("../client/app/apis/dmt/fino/searchCustomer");
const {
  getCustomerLimit,
} = require("../client/app/apis/dmt/fino/getCustomerLimit");
const { customerEkyc } = require("../client/app/apis/dmt/fino/customerEkyc");
const {
  generateRegisterOtp,
} = require("../client/app/apis/dmt/fino/generateRegisterOtp");
const {
  registerCustomer,
} = require("../client/app/apis/dmt/fino/registerCustomer");

exports.searchCustomer = async ({
  userId,
  requestId,
  mobileNumber,
  longitude,
  latitude,
  publicIp,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    const user = await User.findOne({ _id: userId }).select("phone").lean();

    console.log(user, "user");

    await session.commitTransaction();

    let result;

    try {
      result = await searchCustomer({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        merchantMobileNumber: user?.phone,
        mobileNumber,
        longitude,
        latitude,
        publicIp,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        // data: error?.response?.data || error?.fullResponse || null,
      };
    }

    console.log(
      "serach customer fino service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.data?.status !== 1 ||
      result?.data?.statusCode !== "SS0011" ||
      result?.data?.responseData === null
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    throw error;
  }
};

exports.getLimit = async ({ userId, requestId, mobileNumber }) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    await session.commitTransaction();

    let result;

    try {
      result = await getCustomerLimit({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        mobileNumber,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        // data: error?.response?.data || error?.fullResponse || null,
      };
    }

    console.log(
      "check customer limit service",
      JSON.stringify(result, null, 2),
    );

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.data?.status !== 1 ||
      result?.data?.statusCode !== "SS0011" ||
      result?.data?.responseData === null
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    throw error;
  }
};

exports.customerEkyc = async ({
  userId,
  requestId,
  mobileNumber,
  aadharNumber,
  pidData,
  latitude,
  longitude,
  publicIp,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    const user = await User.findOne({ _id: userId }).select("phone").lean();

    console.log(user, "user");

    await session.commitTransaction();

    let result;

    try {
      result = await customerEkyc({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        merchantMobileNumber: user?.phone,
        mobileNumber,
        aadharNumber,
        pidData,
        latitude,
        longitude,
        publicIp,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        // data: error?.response?.data || error?.fullResponse || null,
      };
    }

    console.log("customer ekyc fino service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.data?.status !== 1 ||
      result?.data?.statusCode !== "SS0011" ||
      result?.data?.responseData === null
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    throw error;
  }
};

exports.generateRegOtp = async ({
  userId,
  requestId,
  mobileNumber,
  latitude,
  longitude,
  publicIp,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    const user = await User.findOne({ _id: userId }).select("phone").lean();

    console.log(user, "user");

    await session.commitTransaction();

    let result;

    try {
      result = await generateRegisterOtp({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        merchantMobileNumber: user?.phone,
        mobileNumber,
        latitude,
        longitude,
        publicIp,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        // data: error?.response?.data || error?.fullResponse || null,
      };
    }

    console.log("customer ekyc fino service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.data?.status !== 1 ||
      result?.data?.statusCode !== "SS0011" ||
      result?.data?.responseData === null
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    throw error;
  }
};

exports.registerCustomer = async ({
  userId,
  requestId,
  mobileNumber,
  latitude,
  longitude,
  publicIp,
  otp,
}) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const referenceId = generateUniqueRefernceId();

    const user = await User.findOne({ _id: userId }).select("phone").lean();

    console.log(user, "user");

    await session.commitTransaction();

    let result;

    try {
      result = await registerCustomer({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        merchantMobileNumber: user?.phone,
        mobileNumber,
        latitude,
        longitude,
        publicIp,
        otp,
      });
    } catch (error) {
      result = {
        status: "FAILED",
        message:
          error.reason ||
          error?.response?.data?.message ||
          error.message ||
          "Something went wrong",
        // data: error?.response?.data || error?.fullResponse || null,
      };
    }

    console.log("customer ekyc fino service", JSON.stringify(result, null, 2));

    console.log("Status", result?.status_code || result?.status);

    if (
      result?.status === "FAILED" ||
      result?.data?.status !== 1 ||
      result?.data?.statusCode !== "SS0011" ||
      result?.data?.responseData === null
    ) {
      throw result;
    }

    console.log(result);
    return result;
  } catch (error) {
    throw error;
  }
};

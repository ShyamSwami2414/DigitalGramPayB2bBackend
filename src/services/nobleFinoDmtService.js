const mongoose = require("mongoose");
const User = require("../models/userModel");
const NobleDmtFinoCustomer = require("../models/nobleFinoDmtCustomerModel");
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
const {
  addNobleDmtBeneficiary,
} = require("../client/app/apis/dmt/common/addBeneficiaryClient");
const {
  listNobleDmtBeneficiary,
} = require("../client/app/apis/dmt/common/getBeneficiaryClient");
const {
  deleteNobleDmtBeneficiary,
} = require("../client/app/apis/dmt/common/deleteBeneficiaryClient");
const {
  generateTransactionOtp,
} = require("../client/app/apis/dmt/fino/generateTransactionOtp");

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

    const [user, dmtCustomer] = await Promise.all([
      User.findById(userId).select("phone").lean(),
      NobleDmtFinoCustomer.findOne({
        userId: userId,
        mobile: mobileNumber,
      })
        .select("customerName")
        .lean(),
    ]);

    console.log(user, "user");

    await session.commitTransaction();

    let result;

    try {
      result = await generateRegisterOtp({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        merchantMobileNumber: user?.phone,
        customerName: dmtCustomer?.customerName,
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

    const [user, dmtCustomer] = await Promise.all([
      User.findById(userId).select("phone").lean(),
      NobleDmtFinoCustomer.findOne({
        userId: userId,
        mobile: mobileNumber,
      })
        .select(" ekycRequestId otpRequestId")
        .lean(),
    ]);

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
        otpRequestId: dmtCustomer?.dmtCustomer,
        ekycRequestId: dmtCustomer?.ekycRequestId,
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

exports.generateTOtp = async ({
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

    const [user, dmtCustomer] = await Promise.all([
      User.findById(userId).select("phone").lean(),
      NobleDmtFinoCustomer.findOne({
        userId: userId,
        mobile: mobileNumber,
      })
        .select("customerName ekycRequestId otpRequestId")
        .lean(),
    ]);

    console.log(dmtCustomer, "dmtCustomer");

    console.log(user, "user");

    await session.commitTransaction();

    let result;

    try {
      result = await generateTransactionOtp({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        merchantMobileNumber: user?.phone,
        customerName: dmtCustomer?.customerName,
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

exports.listBeneficiary = async ({ userId, requestId, remitterMobile }) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const referenceId = generateUniqueRefernceId();
    const user = await User.findOne({ _id: userId }).select("phone").lean();

    console.log(user, "user");

    await session.commitTransaction();

    let result;

    try {
      result = await listNobleDmtBeneficiary({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        remitterMobile: remitterMobile,
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

    console.log("add ben dmt service", JSON.stringify(result, null, 2));

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

exports.addBeneficiary = async ({
  userId,
  requestId,
  accountHolderName,
  accountNumber,
  ifsc,
  bankName,
  remitterMobile,
  beneficiaryMobile,
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
      result = await addNobleDmtBeneficiary({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        accountHolderName: accountHolderName,
        accountNumber: accountNumber,
        ifsc: ifsc,
        bankName: bankName,
        remitterMobile: remitterMobile,
        beneficiaryMobile: beneficiaryMobile,
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

    console.log("add ben dmt service", JSON.stringify(result, null, 2));

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

exports.deleteBeneficiary = async ({
  userId,
  requestId,
  remitterMobile,
  accountNumber,
  ifsc,
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
      result = await deleteNobleDmtBeneficiary({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        remitterMobile: remitterMobile,
        accountNumber: accountNumber,
        ifsc: ifsc,
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

    console.log("add ben dmt service", JSON.stringify(result, null, 2));

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

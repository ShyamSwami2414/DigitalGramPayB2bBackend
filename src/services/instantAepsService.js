const mongoose = require("mongoose");
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

const { encryptAadhaar } = require("../helpers/encryptDecryptAadhar");

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

    await session.commitTransaction();

    let result;

    try {
      result = await biometricKycStatus({
        client_referenceId: referenceId, //auto genertae
        userId,
        requestId, //client send idempotency
        spKey: spKey,
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

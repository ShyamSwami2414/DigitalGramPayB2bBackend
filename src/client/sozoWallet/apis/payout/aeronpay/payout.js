const {
  generateUniqueRefernceId,
} = require("../../../../../utils/generateUniqueReferenceId");
const {
  generateRequestId,
} = require("../../../../../utils/requestIdGenerator");
const SozoPayoutLog = require("../../../../../models/sozoPayoutLogsModel");
const { paiseToRupee } = require("../../../../../utils/money");
const sozoClient = require("../../../sozo.clent");

exports.initiatePayout = async ({
  client_referenceId,
  userId,
  requestId,
  amount, //paise
  bankAccount,
  ifsc,
  name,
  email,
  phone,
  bankProfileId,
  address,
  latitude,
  longitude,
  remarks,
}) => {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();

  const amountInRupee = paiseToRupee(amount); //rupee

  console.log(amountInRupee, "amountInRupee");

  try {
    const response = await sozoClient.post(
      "v1/payout/s/imps-payout",
      {
        amount: amountInRupee, //rupee
        reference: client_referenceId,
        bankAccount: bankAccount,
        ifsc: ifsc,
        name: name,
        email: email,
        phone: phone,
        bankProfileId: bankProfileId,
        address: address,
        latitude: latitude,
        longitude: longitude,
        remarks: remarks,
      },
      {
        headers: {
          ApiKey: process.env.SOZO_API_KEY,
          SecretKey: process.env.SOZO_SECRET_KEY,
          UserId: process.env.SOZO_USER_ID,
        },

        // Accept any status code < 500 as "valid" so Axios doesn't throw
        validateStatus: (status) => status < 500,
      },
    );

    console.log(response.data, "response");

    const responseTime = Date.now() - startTime;

    let apiStatus = response?.data?.data?.status;

    let providerStatus =
      apiStatus === "SUCCESS"
        ? "SUCCESS"
        : apiStatus === "PENDING"
          ? "PENDING"
          : "FAILED";

    if (providerStatus === "FAILED") {
      throw {
        providerStatus: providerStatus,
        error: response?.data?.errors,
        message: response?.data?.message || response?.data?.data?.message,
        fullResponse: response?.data,
      };
    }

    await SozoPayoutLog.create({
      providerTxnId: response?.data?.data?.transactionId,
      userId: userId,
      type: "PAYOUT",
      referenceId: client_referenceId,
      providerName: "SOZO_WALLET",
      endPoint: "v1/payout/s/imps-payout",
      method: "POST",

      request: {
        amount: amountInRupee, //rupee
        reference: client_referenceId,
        bankAccount: bankAccount,
        ifsc: ifsc,
        name: name,
        email: email,
        phone: phone,
        bankProfileId: bankProfileId,
        address: address,
        latitude: latitude,
        longitude: longitude,
        remarks: remarks,
      },

      response: response.data,
      providerStatus: providerStatus,
      responseTime,
    });

    return response.data;
  } catch (error) {
    console.log(
      "API Error Response:",
      error?.errors || error.response?.data || error?.message,
    );

    await SozoPayoutLog.create({
      providerTxnId: error.response?.data?.transactionId,
      userId: userId,
      type: "PAYOUT",
      referenceId: client_referenceId,
      providerName: "SOZO_WALLET",
      endPoint: "v1/payout/s/imps-payout",
      method: "POST",
      request: {
        amount: amountInRupee, //rupee
        reference: client_referenceId,
        bankAccount: bankAccount,
        ifsc: ifsc,
        name: name,
        email: email,
        phone: phone,
        bankProfileId: bankProfileId,
        address: address,
        latitude: latitude,
        longitude: longitude,
        remarks: remarks,
      },
      response: error.fullResponse ||
        error.response?.data || { message: error.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });

    throw error; // optional, if you want the service to know it failed
  }
};

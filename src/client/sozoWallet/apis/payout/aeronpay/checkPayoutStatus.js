const {
  generateUniqueRefernceId,
} = require("../../../../../utils/generateUniqueReferenceId");
const {
  generateRequestId,
} = require("../../../../../utils/requestIdGenerator");
const ProviderLogs = require("../../../../../models/providerLogsModel");
const { paiseToRupee } = require("../../../../../utils/money");
const sozoClient = require("../../../sozo.clent");

exports.aepsPayoutStatus = async ({
  client_referenceId,
  userId,
  requestId,
  transactionId,
}) => {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();

  try {
    const response = await sozoClient.post(
      "v1/payout/s/check-status",
      {
        txn_id: transactionId,
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

    let providerStatus = response.data.success === true ? "SUCCESS" : "FAILED";

    if (providerStatus !== "SUCCESS") {
      throw {
        providerStatus: providerStatus,
        error: response?.data?.errors,
        message: response?.data?.message || response?.data?.data?.message,
        fullResponse: response?.data,
      };
    }

    await ProviderLogs.create({
      providerTxnId: response?.data?.data?.transactionId,
      serviceCategory: "PAYOUT",
      referenceId: client_referenceId,
      providerName: "SOZO_WALLET",
      endPoint: "payout/s/check-status",
      method: "POST",

      request: {
        txn_id: transactionId,
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

    await ProviderLogs.create({
      providerTxnId: error.response?.data?.transactionId || undefined,
      serviceCategory: "PAYOUT",
      referenceId: client_referenceId,
      providerName: "SOZO_WALLET",
      endPoint: "payout/s/check-status",
      method: "POST",
      request: {
        txn_id: transactionId,
      },
      response: error.fullResponse ||
        error.response?.data || { message: error.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });

    throw error; // optional, if you want the service to know it failed
  }
};

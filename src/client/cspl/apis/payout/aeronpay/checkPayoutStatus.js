const {
  generateUniqueRefernceId,
} = require("../../../../../utils/generateUniqueReferenceId");
const {
  generateRequestId,
} = require("../../../../../utils/requestIdGenerator");
const SozoPayoutLog = require("../../../../../models/sozoPayoutLogsModel");
const { paiseToRupee } = require("../../../../../utils/money");
const csplClient = require("../../../cspl.client");

exports.aepsPayoutStatus = async ({
  client_referenceId,
  userId,
  requestId,
  transactionId,
}) => {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();

  try {
    const response = await csplClient.post(
      "aer/payout/check-status",
      {
        txn_id: transactionId,
      },
      {
        headers: {
          "X-TIMESTAMP": timestamp,
          "X-REQUEST-ID": client_referenceId,
          "X-API-KEY": process.env.CSPL_API_KEY,
          "X-Forwarded-For": process.env.SERVER_IP,
        },

        // Accept any status code < 500 as "valid" so Axios doesn't throw
        validateStatus: (status) => status < 500,
      },
    );

    console.log(response.data, "response");

    const responseTime = Date.now() - startTime;

    let providerStatus =
      response?.data?.success === true && response?.data?.code === 200
        ? "SUCCESS"
        : "FAILED";

    if (providerStatus !== "SUCCESS") {
      throw {
        providerStatus: providerStatus,
        error: response?.data?.errors,
        message: response?.data?.message || response?.data?.data?.message,
        fullResponse: response?.data,
      };
    }

    await SozoPayoutLog.create({
      providerTxnId: response?.data?.data?.transactionId || undefined,
      userId: userId,
      type: "PAYOUT_STATUS",
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
      userId: userId,
      type: "PAYOUT_STATUS",
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

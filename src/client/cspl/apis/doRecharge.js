const {
  generateUniqueRefernceId,
} = require("../../../utils/generateUniqueReferenceId");
const { generateRequestId } = require("../../../utils/requestIdGenerator");
const csplClient = require("../cspl.client");
const ProviderLogs = require("../../../models/providerLogsModel");
const { paiseToRupee } = require("../../../utils/money");

exports.doRecharge = async ({
  client_referenceId,
  amount, //paise
  operatorCode,
  number,
  billerMode,
}) => {
  const requestId = generateRequestId();

  const timestamp = new Date().toISOString();
  const startTime = Date.now();

  const amountInRupee = paiseToRupee(amount); //rupee

  console.log(amountInRupee, "amountInRupee");

  try {
    const response = await csplClient.post(
      "mobile-prepaid-Recharge",
      {
        amount: amountInRupee, //rupee
        client_referenceId,
        operatorCode,
        number,
        billerMode,
      },
      {
        headers: {
          "X-TIMESTAMP": timestamp,
          "X-REQUEST-ID": requestId,
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
      response.data.status === "SUCCESS" ? "SUCCESS" : "FAILED";

    await ProviderLogs.create({
      providerTxnId: response?.data?.txn_ref,
      referenceId: client_referenceId,
      providerName: "CSPL",
      endPoint: "mobile-prepaid-Recharge",
      method: "POST",

      request: {
        amount,
        operatorCode,
        number,
        billerMode,
        client_referenceId,
      },

      response: response.data,
      providerStatus: providerStatus,
      responseTime,
    });

    return response.data;
  } catch (error) {
    console.log("API Error Response:", error.response?.data || error.message);

    await ProviderLogs.create({
      providerTxnId: error.response?.data?.txn_ref || null,
      referenceId: client_referenceId,
      providerName: "CSPL",
      endPoint: "mobile-prepaid-Recharge",
      method: "POST",
      request: { amount, operatorCode, number, billerMode, client_referenceId },
      response: error.response?.data || { message: error.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });

    throw error; // optional, if you want the service to know it failed
  }
};

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

  // return {
  //   status: "SUCCESS",
  //   txn_ref: "RCHG20260320153342533099",
  //   utr: null,
  //   message: "Transaction Successful",
  // };

  try {
    const response = await csplClient.post(
      "mobile-prepaid-Recharge",
      {
        amount: amountInRupee, //rupee
        client_referenceId: client_referenceId,
        operatorCode: operatorCode,
        number: number,
        billerMode: billerMode,
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
      response?.data?.status === "SUCCESS" ? "SUCCESS" : "FAILED";

    if (providerStatus !== "SUCCESS") {
      throw {
        providerStatus: providerStatus,
        message: response?.data?.message,
        txn_ref: response?.data?.txn_ref,
        fullResponse: response?.data,
      };
    }

    await ProviderLogs.create({
      providerTxnId: response?.data?.txn_ref || undefined,
      serviceCategory: "RECHARGE",
      referenceId: client_referenceId,
      providerName: "CSPL",
      endPoint: "mobile-prepaid-Recharge",
      method: "POST",

      request: {
        amount: amountInRupee, //rupee
        client_referenceId: client_referenceId,
        operatorCode: operatorCode,
        number: number,
        billerMode: billerMode,
      },

      response: response.data,
      providerStatus: providerStatus,
      responseTime,
    });

    return response.data;
  } catch (error) {
    console.log("API Error Response:", error.response?.data || error.message);

    await ProviderLogs.create({
      providerTxnId: error.response?.data?.txn_ref || error?.txn_ref || undefined,
      serviceCategory: "RECHARGE",
      referenceId: client_referenceId,
      providerName: "CSPL",
      endPoint: "mobile-prepaid-Recharge",
      method: "POST",
      request: {
        amount: amountInRupee, //rupee
        client_referenceId: client_referenceId,
        operatorCode: operatorCode,
        number: number,
        billerMode: billerMode,
      },
      response: error.fullResponse ||
        error.response?.data || { message: error.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });

    throw error; // optional, if you want the service to know it failed
  }
};

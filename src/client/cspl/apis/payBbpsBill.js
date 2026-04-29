const ProviderLogs = require("../../../models/providerLogsModel");
const { generateRequestId } = require("../../../utils/requestIdGenerator");
const csplClient = require("../cspl.client");

//amount of paymnet goes in paise always in bbps
exports.payBbpsBill = async ({
  client_referenceId,
  requestId,
  billerId,
  customerName,
  customerMobile,
  dueDate,
  billamount, //paise
  billDate,
  billPeriod,
  billNumber,
  placeholderValue,
  paramValue,
  inputParams,
}) => {
  return console.log(billamount, "billamount  in paise");
  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  try {
    const response = await csplClient.post(
      "bbps/billpay",
      {
        requestId,
        billerId,
        customerName,
        customerMobile,
        dueDate,
        billamount, //paise always
        billDate,
        billPeriod,
        billNumber,
        placeholderValue,
        paramValue,
        inputParams,
      },
      {
        headers: {
          "X-TIMESTAMP": timestamp,
          "X-REQUEST-ID": client_referenceId,
          "X-API-KEY": process.env.CSPL_API_KEY,
          "X-Forwarded-For": process.env.SERVER_IP,
        },

        // Accept any status code < 500 as "valid" so Axios doesn't throw
        validateStatus: (status) => status < 400,
      },
    );

    console.log(response.data, "response");

    const responseTime = Date.now() - startTime;

    let providerStatus =
      response.data.status === "SUCCESS" ? "SUCCESS" : "FAILED";

    await ProviderLogs.create({
      providerTxnId: response?.data?.billerstatus?.txnRefId || undefined,
      serviceCategory: "BBPS",
      referenceId: client_referenceId,
      providerName: "CSPL",
      endPoint: "bbps/billpay",
      method: "POST",

      request: {
        requestId,
        billerId,
        customerName,
        customerMobile,
        dueDate,
        billamount,
        billDate,
        billPeriod,
        billNumber,
        placeholderValue,
        paramValue,
        client_referenceId: client_referenceId,
      },

      response: response.data,
      providerStatus: providerStatus,
      responseTime,
    });

    return response?.data;
  } catch (error) {
    console.log("API Error Response:", error.response?.data || error.message);

    await ProviderLogs.create({
      providerTxnId: error.response?.data?.txn_ref || undefined,
      serviceCategory: "BBPS",
      referenceId: client_referenceId,
      providerName: "CSPL",
      endPoint: "bbps/billpay",
      method: "POST",
      request: {
        requestId,
        billerId,
        customerName,
        customerMobile,
        dueDate,
        billamount,
        billDate,
        billPeriod,
        billNumber,
        placeholderValue,
        paramValue,
        client_referenceId: client_referenceId,
      },
      response: error.response?.data || { message: error.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });
    throw error;
  }
};

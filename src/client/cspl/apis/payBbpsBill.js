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
  catname,
  billDate,
  billPeriod,
  billNumber,
  placeholderValue,
  paramValue,
  inputParams,
  additionalInfo,
}) => {
  // return console.log(billamount, "billamount  in paise");
  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  try {
    const response = await csplClient.post(
      "bbps/billpay",
      {
        requestId: requestId,
        billerId: billerId,
        customerName: customerName,
        customerMobile: customerMobile,
        dueDate: dueDate,
        billamount: billamount, //paise always
        catname: catname,
        billDate: billDate,
        billPeriod: billPeriod,
        billNumber: billNumber,
        placeholderValue: placeholderValue,
        paramValue: paramValue,
        inputParams: inputParams,
        additionalInfo: additionalInfo,
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

    console.log(response?.data, "response");

    const responseTime = Date.now() - startTime;

    let providerStatus;

    if (["SUCCESS", "SUCCESSFUL"].includes(response?.data?.status)) {
      providerStatus = "SUCCESS";
    } else if (response?.data?.status === "PENDING") {
      providerStatus = "PENDING";
    } else {
      providerStatus = "FAILED";
    }

    if (providerStatus === "FAILED") {
      throw {
        providerStatus: providerStatus,
        message:
          response?.data?.message ||
          response?.data?.data?.errorInfo?.error?.[0]?.errorMessage,
        txn_ref: response?.data?.txnid,
        data: response?.data,
      };
    }

    await ProviderLogs.create({
      providerTxnId: response?.data?.txnid || undefined,
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
        additionalInfo: additionalInfo,
      },

      response: response.data,
      providerStatus: providerStatus,
      responseTime,
    });

    return response?.data;
  } catch (error) {
    console.log(
      "API Error Response:",
      error?.data || error?.response?.data || error?.message,
    );

    await ProviderLogs.create({
      providerTxnId: error?.response?.data?.txn_ref || undefined,
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
        additionalInfo: additionalInfo,
      },
      response: error?.data ||
        error?.response?.data || { message: error?.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });
    throw error;
  }
};

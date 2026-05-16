const csplClient = require("../../../cspl.client");
const NobleDmtLog = require("../../../../../models/nobleDmtLogModel");

exports.getCustomerLimit = async ({
  client_referenceId,
  userId,
  requestId, //idempotency key
  mobileNumber,
}) => {
  const timestamp = new Date().toISOString().slice(0, 19);
  const startTime = Date.now();

  try {
    const response = await csplClient.post(
      "fi/dmt/customer-limit",
      {
        customerMobileNo: mobileNumber,
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

    const isSuccess =
      response?.data?.data?.statusCode === "SS0011" ||
      response?.data?.data?.status === 1;

    let providerStatus = isSuccess ? "SUCCESS" : "FAILED";

    if (providerStatus !== "SUCCESS") {
      throw {
        providerStatus: providerStatus,
        message: response?.data.message,
        reason: response?.data?.data?.description,
        fullResponse: response?.data,
      };
    }

    await NobleDmtLog.create({
      providerTxnId: response?.data?.txn_ref || undefined,
      serviceCategory: "DMT",
      userId: userId,
      type: "CUSTOMER-LIMIT",
      referenceId: client_referenceId,
      providerName: "NOBLE_FINO",
      endPoint: "fi/dmt/customer-limit",
      method: "POST",
      request: {
        customerMobileNo: mobileNumber,
      },

      response: response.data,
      providerStatus: providerStatus,
      responseTime,
    });

    return response?.data;
  } catch (error) {
    console.log("API Error Response:", error.response?.data || error.message);

    await NobleDmtLog.create({
      providerTxnId: error?.response?.data?.txn_ref || undefined,
      serviceCategory: "DMT",
      userId: userId,
      type: "CUSTOMER-LIMIT",
      referenceId: client_referenceId,
      providerName: "NOBLE_FINO",
      endPoint: "fi/dmt/customer-limit",
      method: "POST",
      request: {
        customerMobileNo: mobileNumber,
      },
      response: error.fullResponse ||
        error.response?.data || { message: error.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });
    throw error;
  }
};

const csplClient = require("../../../cspl.client");
const ProviderLogs = require("../../../../../models/providerLogsModel");

exports.getCustomer = async ({
  userId,
  requestId, //idempotency key
  client_referenceId,
  mobile,
  latitude,
  longitude,
  merchantMobileNumber,
}) => {
  console.log(captureType, "captureType");
  const timestamp = new Date().toISOString().slice(0, 19);
  const startTime = Date.now();
  const token = process.env.APP_DMT_BEARER_TOKEN;

  try {
    const response = await csplClient.post(
      "ar/get-customer",
      {
        mobileNumber: mobile,
        latitude: latitude,
        longitude: longitude,
        merchantMobileNumber: merchantMobileNumber,
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
      response?.data?.statusCode === "RS015" ||
      response?.data?.status === 1 ||
      response?.data?.statusCode === "SS0011";
    response?.data?.statusCode === "DB0031";

    let providerStatus = isSuccess ? "SUCCESS" : "FAILED";

    if (providerStatus !== "SUCCESS") {
      throw {
        providerStatus: providerStatus,
        message: response?.data.message,
      };
    }

    await ProviderLogs.create({
      providerTxnId: response?.data?.txn_ref || undefined,
      serviceCategory: "DMT",
      userId: userId,
      referenceId: client_referenceId,
      providerName: "NOBLE_AIRTEL",
      endPoint: "ar/get-customer",
      method: "POST",
      request: {
        mobileNumber: mobile,
        latitude: latitude,
        longitude: longitude,
        merchantMobileNumber: merchantMobileNumber,
      },

      response: response.data,
      providerStatus: providerStatus,
      responseTime,
    });

    return response?.data;
  } catch (error) {
    console.log("API Error Response:", error.response?.data || error.message);

    await ProviderLogs.create({
      providerTxnId: error?.response?.data?.txn_ref || undefined,
      serviceCategory: "DMT",
      userId: userId,
      referenceId: client_referenceId,
      providerName: "NOBLE_AIRTEL",
      endPoint: "ar/get-customer",
      method: "POST",
      request: {
        mobileNumber: mobile,
        latitude: latitude,
        longitude: longitude,
        merchantMobileNumber: merchantMobileNumber,
      },
      response: error.response?.data || { message: error.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });
    throw error;
  }
};

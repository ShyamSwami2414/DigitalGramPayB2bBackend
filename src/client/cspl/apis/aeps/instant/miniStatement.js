const csplClient = require("../../../cspl.client");
const InstantAepsLogs = require("../../../../../models/instantAepsLogsModel");

exports.miniStatement = async ({
  userId,
  requestId, //idempotency key
  client_referenceId,
  mcode,
  mobile,
  bankiin,
  latitude,
  longitude,
  captureType,
  biometricData,
}) => {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  try {
    const response = await csplClient.post(
      "aeps/miniStatement",
      {
        mobile,
        bankiin,
        externalRef: client_referenceId,
        latitude: latitude,
        longitude: longitude,
        captureType: captureType,
        biometricData: biometricData,
      },
      {
        headers: {
          "X-TIMESTAMP": timestamp,
          "X-REQUEST-ID": client_referenceId,
          "X-API-KEY": process.env.CSPL_API_KEY,
          "X-Forwarded-For": process.env.SERVER_IP,
          mcode: mcode,
        },

        // Accept any status code < 500 as "valid" so Axios doesn't throw
        validateStatus: (status) => status < 400,
      },
    );

    console.log(response.data, "response");

    const responseTime = Date.now() - startTime;

    const isSuccess =
      response.data.status === "TXN" || response.data.status_code === "TXN";

    let providerStatus = isSuccess ? "SUCCESS" : "FAILED";

    if (providerStatus !== "SUCCESS") {
      throw {
        providerStatus: providerStatus,
        message: response?.data.message,
      };
    }

    await InstantAepsLogs.create({
      providerTxnId: response?.data?.txn_ref || undefined,
      userId: userId,
      referenceId: client_referenceId,
      type: "AEPS-MINI-STM",
      providerName: "INSTANT_PAY",
      endPoint: "aeps/miniStatement",
      method: "POST",
      request: {
        mobile,
        bankiin,
        externalRef: client_referenceId,
        latitude: latitude,
        longitude: longitude,
        captureType: captureType,
        biometricData: biometricData,
        header: {
          mcode: mcode,
        },
      },

      response: response.data,
      providerStatus: providerStatus,
      responseTime,
    });

    return response?.data;
  } catch (error) {
    console.log("API Error Response:", error.response?.data || error.message);

    await InstantAepsLogs.create({
      providerTxnId: error?.response?.data?.txn_ref || undefined,
      userId: userId,
      referenceId: client_referenceId,
      type: "AEPS-MINI-STM",
      providerName: "INSTANT_PAY",
      endPoint: "aeps/miniStatement",
      method: "POST",
      request: {
        mobile,
        bankiin,
        externalRef: client_referenceId,
        latitude: latitude,
        longitude: longitude,
        captureType: captureType,
        biometricData: biometricData,
        header: {
          mcode: mcode,
        },
      },
      response: error.response?.data || { message: error.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });
    throw error;
  }
};

const csplClient = require("../../../cspl.client");
const InstantAepsLogs = require("../../../../../models/instantAepsLogsModel");

exports.biometricKyc = async ({
  userId,
  requestId, //idempotency key
  client_referenceId,
  referenceKey,
  mcode,
  latitude,
  longitude,
  captureType,
  biometricData,
}) => {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  try {
    const response = await csplClient.post(
      "aeps/BiometricKyc",
      {
        externalRef: client_referenceId,
        referenceKey: referenceKey, //temporary for biometric get from kyc check data
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

    console.log(response?.data, "response");

    const responseTime = Date.now() - startTime;

    const isSuccess =
      response?.data?.status === "TXN" || response?.data?.status_code === "TXN";

    console.log("isSuccess", isSuccess);

    let providerStatus = isSuccess ? "SUCCESS" : "FAILED";

    if (providerStatus !== "SUCCESS") {
      throw {
        providerStatus: providerStatus,
        message: response?.data.message,
        fullResponse: response?.data,
      };
    }

    console.log("Success Bl;ock Log");

    try {
      await InstantAepsLogs.insertOne({
        providerTxnId: response?.data?.txn_ref || undefined,
        userId: userId,
        referenceId: client_referenceId,
        type: "AEPS-BIOMETRIC-KYC",
        providerName: "INSTANT_PAY",
        endPoint: "aeps/BiometricKyc",
        method: "POST",
        request: {
          externalRef: client_referenceId,
          referenceKey: referenceKey, //temporary for biometric get from kyc check data
          latitude: latitude,
          longitude: longitude,
          captureType: captureType,
          // biometricData: biometricData,
          header: {
            mcode: mcode,
          },
        },

        response: response?.data,
        providerStatus: providerStatus,
        responseTime,
      });
    } catch (logError) {
      console.log("❌ LOG SAVE FAILED suCCESS:", logError);
    }

    return response?.data;
  } catch (error) {
    console.log("API Error Response:", error?.response?.data || error?.message);

    console.log("Failed Block Log");
    console.log("🚀 BEFORE LOG SAVE");

    try {
      await InstantAepsLogs.insertOne({
        providerTxnId: error?.response?.data?.txn_ref || undefined,
        userId: userId,
        referenceId: client_referenceId,
        type: "AEPS-BIOMETRIC-KYC",
        providerName: "INSTANT_PAY",
        endPoint: "aeps/BiometricKyc",
        method: "POST",
        request: {
          externalRef: client_referenceId,
          referenceKey: referenceKey, //temporary for biometric get from kyc check data
          latitude: latitude,
          longitude: longitude,
          captureType: captureType,
          // biometricData: biometricData,
          header: {
            mcode: mcode,
          },
        },
        response: error?.fullResponse ||
          error?.response?.data || { message: error?.message },
        providerStatus: "FAILED",
        responseTime: Date.now() - startTime,
      });
    } catch (logError) {
      console.log("❌ LOG SAVE FAILED:", logError);
    }

    console.log("✅ AFTER LOG SAVE");

    throw error;
  }
};

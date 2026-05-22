const csplClient = require("../../../cspl.client");
const NobleAepsLogs = require("../../../../../models/nobleAepsLogsModel");

exports.dailyLogin = async ({
  userId,
  requestId, //client send idempotency
  transactionId, //auto genertae
  uniqueAgentId,
  latitude,
  longitude,
  bioType,
  pidData,
  channel,
  ipAddress,
  userAgent,
  mobileDeviceId,
}) => {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  const serviceType = "AEPS";
  try {
    const response = await csplClient.post(
      "e2/aeps/daily-2fa",
      {
        transactionId: transactionId,
        uniqueAgentId: uniqueAgentId,
        serviceType: serviceType,
        channel: channel,
        mobileDeviceId: mobileDeviceId,
        ipAddress: ipAddress,
        userAgent: userAgent,
        latitude: String(latitude),
        longitude: String(longitude),
        bioType: String(bioType),
        pidData: pidData,
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

    const isSuccess =
      response?.data?.status === 1 ||
      response?.data?.statusCode === "AG0001" ||
      response?.data?.statusCode === "AG00001";

    console.log("isSuccess", isSuccess);

    let providerStatus = isSuccess ? "SUCCESS" : "FAILED";

    if (providerStatus !== "SUCCESS") {
      throw {
        providerStatus: providerStatus,
        message: response?.data.message,
        fullResponse: response?.data,
      };
    }

    console.log("Success Block Log");

    try {
      await NobleAepsLogs.insertOne({
        providerTxnId: response?.data?.txn_ref || undefined,
        userId: userId,
        referenceId: transactionId,
        type: "DAILY-LOGIN",
        providerName: "NOBLE",
        endPoint: "e2/aeps/daily-2fa",
        method: "POST",
        request: {
          transactionId: transactionId,
          uniqueAgentId: uniqueAgentId,
          serviceType: serviceType,
          channel: channel,
          mobileDeviceId: mobileDeviceId,
          ipAddress: ipAddress,
          userAgent: userAgent,
          latitude: String(latitude),
          longitude: String(longitude),
          bioType: String(bioType),
          pidData: pidData,
        },

        response: response?.data,
        providerStatus: providerStatus,
        responseTime,
      });
    } catch (logError) {
      console.log(" LOG SAVE FAILED suCCESS:", logError);
    }

    return response?.data;
  } catch (error) {
    console.log("API Error Response:", error?.response?.data || error?.message);

    console.log("Failed Block Log");
    console.log(" BEFORE LOG SAVE");

    try {
      await NobleAepsLogs.insertOne({
        providerTxnId: error?.response?.data?.txn_ref || undefined,
        userId: userId,
        referenceId: transactionId,
        type: "DAILY-LOGIN",
        providerName: "NOBLE",
        endPoint: "e2/aeps/kyc",
        method: "POST",
        request: {
          transactionId: transactionId,
          uniqueAgentId: uniqueAgentId,
          serviceType: serviceType,
          channel: channel,
          mobileDeviceId: mobileDeviceId,
          ipAddress: ipAddress,
          userAgent: userAgent,
          latitude: String(latitude),
          longitude: String(longitude),
          bioType: String(bioType),
          pidData: pidData,
        },
        response: error?.fullResponse ||
          error?.response?.data || { message: error?.message },
        providerStatus: "FAILED",
        responseTime: Date.now() - startTime,
      });
    } catch (logError) {
      console.log(" LOG SAVE FAILED:", logError);
    }

    console.log(" AFTER LOG SAVE");

    throw error;
  }
};

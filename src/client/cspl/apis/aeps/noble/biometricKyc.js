const csplClient = require("../../../cspl.client");
const NobleAepsLogs = require("../../../../../models/nobleAepsLogsModel");

exports.kyc = async ({
  userId,
  requestId, //idempotency key
  transactionId,
  uniqueAgentId,
  channel,
  mobileDeviceId,
  ipAddress,
  userAgent,
  latitude,
  longitude,
  businessNature,
  annualIncome,
  bioType, //in code 0, 1, 2
  pidData,
}) => {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  try {
    const response = await csplClient.post(
      "e2/aeps/kyc",
      {
        transactionId: transactionId,
        uniqueAgentId: uniqueAgentId,
        channel: channel,
        mobileDeviceId: mobileDeviceId,
        ipAddress: ipAddress,
        userAgent: userAgent,
        latitude: String(latitude),
        longitude: String(longitude),
        businessNature: "Mobility",
        annualIncome: annualIncome,
        bioType: String(bioType),
        pidData: pidData,
      },
      {
        headers: {
          "X-TIMESTAMP": timestamp,
          "X-REQUEST-ID": transactionId,
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
      response?.data?.data?.status === 1 &&
      response?.data?.data?.statusCode === "AG0001" &&
      response?.data?.data?.responseData?.[0]?.tranStatus === "Success";

    console.log("isSuccess", isSuccess);

    let providerStatus = isSuccess ? "SUCCESS" : "FAILED";

    if (providerStatus !== "SUCCESS") {
      throw {
        providerStatus: providerStatus,
        message:
          response?.data?.data?.description ||
          response?.data?.data?.message ||
          response?.data?.message,

        fullResponse: response?.data,
      };
    }

    console.log("Success Block Log");

    try {
      await NobleAepsLogs.insertOne({
        providerTxnId: response?.data?.txn_ref || undefined,
        userId: userId,
        referenceId: transactionId,
        type: "AEPS-BIOMETRIC-KYC",
        providerName: "NOBLE",
        endPoint: "e2/aeps/kyc",
        method: "POST",
        request: {
          transactionId: transactionId,
          uniqueAgentId: uniqueAgentId,
          channel: channel,
          mobileDeviceId: mobileDeviceId,
          ipAddress: ipAddress,
          userAgent: userAgent,
          latitude: String(latitude),
          longitude: String(longitude),
          businessNature: "Mobility",
          annualIncome: annualIncome,
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
        type: "AEPS-BIOMETRIC-KYC",
        providerName: "NOBLE",
        endPoint: "e2/aeps/kyc",
        method: "POST",
        request: {
          transactionId: transactionId,
          uniqueAgentId: uniqueAgentId,
          channel: channel,
          mobileDeviceId: mobileDeviceId,
          ipAddress: ipAddress,
          userAgent: userAgent,
          latitude: String(latitude),
          longitude: String(longitude),
          businessNature: "Mobility",
          annualIncome: annualIncome,
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

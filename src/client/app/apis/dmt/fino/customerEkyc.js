const appClient = require("../../../app.client");
const NobleDmtLog = require("../../../../../models/nobleDmtLogModel");

exports.customerEkyc = async ({
  client_referenceId,
  userId,
  requestId, //idempotency key
  merchantMobileNumber,
  mobileNumber,
  aadharNumber,
  pidData,
  latitude,
  longitude,
  publicIp,
}) => {
  const timestamp = new Date().toISOString().slice(0, 19);
  const startTime = Date.now();

  try {
    const response = await appClient.post(
      "dmt/customer-ekyc",
      {
        merchantMobileNo: merchantMobileNumber,
        customerMobileNo: mobileNumber,
        aadharNo: aadharNumber,
        pidData: pidData,
        bioType: "0",
        latitude: String(latitude),
        longitude: String(longitude),
        publicIp: publicIp,
      },
      {
        headers: {
          ApiKey: process.env.APP_API_KEY,
          SecretKey: process.env.APP_SECRET_KEY,
          UserId: process.env.APP_USERID_NOBLE_DMT,
          "X-Timestamp": timestamp,
          "Content-Type": "application/json",
        },

        // Accept any status code < 500 as "valid" so Axios doesn't throw
        validateStatus: (status) => status < 400,
      },
    );

    console.log(response.data, "response");

    const responseTime = Date.now() - startTime;

    const isSuccess =
      response?.data?.data?.statusCode === "SS0011" &&
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
      type: "CUSTOMER-EKYC",
      referenceId: client_referenceId,
      providerName: "NOBLE_FINO",
      endPoint: "dmt/customer-ekyc",
      method: "POST",
      request: {
        merchantMobileNo: merchantMobileNumber,
        customerMobileNo: mobileNumber,
        aadharNo: aadharNumber,
        pidData: pidData,
        bioType: "0",
        latitude: String(latitude),
        longitude: String(longitude),
        publicIp: publicIp,
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
      type: "CUSTOMER-EKYC",
      referenceId: client_referenceId,
      providerName: "NOBLE_FINO",
      endPoint: "dmt/customer-ekyc",
      method: "POST",
      request: {
        merchantMobileNo: merchantMobileNumber,
        customerMobileNo: mobileNumber,
        aadharNo: aadharNumber,
        pidData: pidData,
        bioType: "0",
        latitude: String(latitude),
        longitude: String(longitude),
        publicIp: publicIp,
      },
      response: error.fullResponse ||
        error.response?.data || { message: error.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });
    throw error;
  }
};

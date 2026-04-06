const csplClient = require("../../../../cspl/cspl.client");
const InstantAepsLogs = require("../../../../../models/instantAepsLogsModel");

exports.outletRegister = async ({
  client_referenceId,
  userId,
  requestId,
  name,
  email,
  mobile,
  aadhaar,
  longitude,
  latitude,
  pan,
  dateOfBirth,
  gender,
  address,
}) => {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  try {
    const response = await csplClient.post(
      "aeps/outletRegister",
      {
        name,
        email,
        mobile,
        aadhaar,
        pan,
        dateOfBirth,
        gender,
        longitude,
        latitude,
        address,
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
      type: "AEPS-ONBOARD",
      providerName: "INSTANT_PAY",
      endPoint: "aeps/outletRegister",
      method: "POST",
      request: {
        requestId: requestId,
        name: name,
        email: email,
        mobile: mobile,
        aadhaar: aadhaar,
        longitude: longitude,
        latitude: latitude,
        pan: pan,
        dateOfBirth: dateOfBirth,
        gender: gender,
        address: address,
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
      type: "AEPS-ONBOARD",
      providerName: "INSTANT_PAY",
      endPoint: "aeps/outletRegister",
      method: "POST",
      request: {
        requestId: requestId,
        name: name,
        email: email,
        mobile: mobile,
        aadhaar: aadhaar,
        longitude: longitude,
        latitude: latitude,
        pan: pan,
        dateOfBirth: dateOfBirth,
        gender: gender,
        address: address,
      },
      response: error.response?.data || { message: error.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });
    throw error;
  }
};

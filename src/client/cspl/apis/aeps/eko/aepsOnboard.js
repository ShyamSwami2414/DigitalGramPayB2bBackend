const csplClient = require("../../../cspl.client");

const EkoAepsLogs = require("../../../../../models/ekoAepsLogsModel");

exports.aepsOnboard = async ({
  client_referenceId,
  userId,
  requestId, //idempotency key
  mobile,
  panNumber,
  firstName,
  lastName,
  email,
  dateOfBirth,
  shopName,
  address,
}) => {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  try {
    const response = await csplClient.post(
      "e1/aeps/AepsOnboard",
      {
        client_ref_id: client_referenceId,
        mobile: mobile,
        pan_number: panNumber,
        first_name: firstName,
        last_name: lastName,
        email: email,
        dob: dateOfBirth,
        shop_name: shopName,
        address: address,
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

    const isSuccess = response?.data?.data?.response_type_id === 1290;

    let providerStatus = isSuccess ? "SUCCESS" : "FAILED";

    if (providerStatus !== "SUCCESS") {
      throw {
        providerStatus: providerStatus,
        message: response?.data?.data?.message,
        reason: response?.data?.data?.data?.reason,
         fullResponse: response?.data,
      };
    }

    await EkoAepsLogs.create({
      providerTxnId: response?.data?.txn_ref || undefined,
      userId: userId,
      referenceId: client_referenceId,
      type: "AEPS-USER-ONBOARD",
      providerName: "EKO",
      endPoint: "e1/aeps/AepsOnboard",
      method: "POST",
      request: {
        client_ref_id: client_referenceId,
        mobile: mobile,
        pan_number: panNumber,
        first_name: firstName,
        last_name: lastName,
        email: email,
        dob: dateOfBirth,
        shop_name: shopName,
        address: address,
      },

      response: response.data,
      providerStatus: providerStatus,
      responseTime,
    });

    return response?.data;
  } catch (error) {
    console.log("API Error Response:", error.response?.data || error.message);

    await EkoAepsLogs.create({
      providerTxnId: error?.response?.data?.txn_ref || undefined,
      userId: userId,
      referenceId: client_referenceId,
      type: "AEPS-USER-ONBOARD",
      providerName: "EKO",
      endPoint: "e1/aeps/AepsOnboard",
      method: "POST",
      request: {
        client_ref_id: client_referenceId,
        mobile: mobile,
        pan_number: panNumber,
        first_name: firstName,
        last_name: lastName,
        email: email,
        dob: dateOfBirth,
        shop_name: shopName,
        address: address,
      },
      response: error.fullResponse ||
        error.response?.data || { message: error.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });
    throw error;
  }
};

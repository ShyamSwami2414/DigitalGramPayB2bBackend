const csplClient = require("../../../cspl.client");

const EkoAepsLogs = require("../../../../../models/ekoAepsLogsModel");

exports.ekycOtpVerify = async ({
  client_referenceId,
  userId,
  requestId, //idempotency key
  initiatorId,
  userCode,
  mobile,
  otp,
  latitude,
  longitude,
  referenceTid,
  otpRefId,
}) => {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  try {
    const response = await csplClient.post(
      "e1/aeps/ekyc-verifyotp",
      {
        client_ref_id: client_referenceId,
        initiator_id: initiatorId,
        user_code: userCode,
        customer_id: mobile, //customer mobile number
        aadhar: aadhaar,
        latlong: `${latitude}, ${longitude}`,
        reference_tid: referenceTid,
        otp: otp,
        otp_ref_id: otpRefId,
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
      };
    }

    await EkoAepsLogs.create({
      providerTxnId: response?.data?.txn_ref || undefined,
      userId: userId,
      referenceId: client_referenceId,
      type: "KYC-OTP-VERIFY",
      providerName: "EKO",
      endPoint: "e1/aeps/ekyc-verifyotp",
      method: "POST",
      request: {
        client_ref_id: client_referenceId,
        initiator_id: initiatorId,
        user_code: userCode,
        customer_id: mobile, //customer mobile number
        aadhar: aadhaar,
        latlong: `${latitude}, ${longitude}`,
        reference_tid: referenceTid,
        otp: otp,
        otp_ref_id: otpRefId,
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
      type: "KYC-OTP-VERIFY",
      providerName: "EKO",
      endPoint: "e1/aeps/ekyc-verifyotp",
      method: "POST",
      request: {
        client_ref_id: client_referenceId,
        initiator_id: initiatorId,
        user_code: userCode,
        customer_id: mobile, //customer mobile number
        aadhar: aadhaar,
        latlong: `${latitude}, ${longitude}`,
        reference_tid: referenceTid,
        otp: otp,
        otp_ref_id: otpRefId,
      },
      response: error.response?.data || { message: error.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });
    throw error;
  }
};

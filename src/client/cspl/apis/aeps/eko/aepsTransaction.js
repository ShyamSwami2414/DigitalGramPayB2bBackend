const csplClient = require("../../../cspl.client");

const EkoAepsLogs = require("../../../../../models/ekoAepsLogsModel");
const { rupeeToPaise, paiseToRupee } = require("../../../../../utils/money");

exports.aepsTransaction = async ({
  client_referenceId,
  userId,
  requestId, //idempotency key
  serviceType,
  initiatorId,
  userCode,
  mobile,
  aadhaar,
  latitude,
  longitude,
  sourceIp,
  amount,
  bankCode,
  pidData,
  serviceTypeName,
}) => {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();

  const amountInRupee = paiseToRupee(amount);
  console.log("amountInRupee", amountInRupee);

  try {
    const response = await csplClient.post(
      "e1/aeps/apes-txn",
      {
        client_ref_id: client_referenceId,
        initiator_id: initiatorId,
        service_type: serviceType,
        latlong: `${latitude}, ${longitude}`,
        source_ip: sourceIp,
        amount: amountInRupee,
        user_code: userCode,
        customer_id: mobile, //customer mobile number
        aadhar: aadhaar,
        bank_code: bankCode,
        piddata: pidData,
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
      (response?.data?.status === true ||
        response?.data?.txn_status === "success") &&
      response?.data?.data?.status === 0 &&
      response?.data?.data?.response_status_id === 0;

    let providerStatus = isSuccess ? "SUCCESS" : "FAILED";

    if (providerStatus !== "SUCCESS") {
      throw {
        providerStatus: providerStatus,
        message: response?.data?.data?.message,
        reason: response?.data?.data?.data?.comment,
        fullResponse: response?.data,
      };
    }

    await EkoAepsLogs.create({
      providerTxnId: response?.data?.txn_ref || undefined,
      userId: userId,
      referenceId: client_referenceId,
      type: `${serviceTypeName}`,
      providerName: "EKO",
      endPoint: "e1/aeps/apes-txn",
      method: "POST",
      request: {
        client_ref_id: client_referenceId,
        initiator_id: initiatorId,
        service_type: serviceType,
        latlong: `${latitude}, ${longitude}`,
        source_ip: sourceIp,
        amount: amountInRupee,
        user_code: userCode,
        customer_id: mobile, //customer mobile number
        aadhar: aadhaar,
        bank_code: bankCode,
        piddata: pidData,
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
      type: `${serviceTypeName}`,
      providerName: "EKO",
      endPoint: "e1/aeps/apes-txn",
      method: "POST",
      request: {
        client_ref_id: client_referenceId,
        initiator_id: initiatorId,
        service_type: serviceType,
        latlong: `${latitude}, ${longitude}`,
        source_ip: sourceIp,
        amount: amountInRupee,
        user_code: userCode,
        customer_id: mobile, //customer mobile number
        aadhar: aadhaar,
        bank_code: bankCode,
        piddata: pidData,
      },
      response: error.fullResponse ||
        error.response?.data || { message: error.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });
    throw error;
  }
};

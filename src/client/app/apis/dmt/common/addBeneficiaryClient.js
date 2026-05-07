const appClient = require("../../../app.client");
const NobleDmtLog = require("../../../../../models/nobleDmtLogModel");

exports.addNobleDmtBeneficiary = async ({
  client_referenceId,
  userId,
  requestId, //idempotency key
  accountHolderName,
  accountNumber,
  ifsc,
  bankName,
  remitterMobile,
  beneficiaryMobile,
}) => {
  const timestamp = new Date().toISOString().slice(0, 19);
  const startTime = Date.now();

  try {
    const response = await appClient.post(
      "bene/add",
      {
        remitterMobile: remitterMobile,
        accountHolderName: accountHolderName,
        accountNumber: accountNumber,
        ifsc: ifsc,
        bankName: bankName,
        beneficiaryMobile: beneficiaryMobile,
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
      userId: userId,
      type: "BEN-ADD",
      referenceId: client_referenceId,
      providerName: "NOBLE",
      endPoint: "bene/add",
      method: "POST",
      request: {
        remitterMobile: remitterMobile,
        accountHolderName: accountHolderName,
        accountNumber: accountNumber,
        ifsc: ifsc,
        bankName: bankName,
        beneficiaryMobile: beneficiaryMobile,
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
      userId: userId,
      type: "BEN-ADD",
      referenceId: client_referenceId,
      providerName: "NOBLE",
      endPoint: "bene/add",
      method: "POST",
      request: {
        remitterMobile: remitterMobile,
        accountHolderName: accountHolderName,
        accountNumber: accountNumber,
        ifsc: ifsc,
        bankName: bankName,
        beneficiaryMobile: beneficiaryMobile,
      },
      response: error.fullResponse ||
        error.response?.data || { message: error.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });
    throw error;
  }
};

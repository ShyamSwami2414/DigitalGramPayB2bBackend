const csplClient = require("../../../cspl.client");
const NobleDmtLog = require("../../../../../models/nobleDmtLogModel");
const { paiseToRupee } = require("../../../../../utils/money");

exports.initiateTransfer = async ({
  client_referenceId,
  userId,
  requestId, //idempotency key
  merchantMobileNumber,
  customerName,
  mobileNumber,
  otp,

  beneficiaryName,
  beneficiaryAccount,
  beneficiaryIfsc,
  amount, //paise

  tOtpRequestId,
  latitude,
  longitude,
  publicIp,
}) => {
  const timestamp = new Date().toISOString().slice(0, 19);
  const startTime = Date.now();
  const transferMode = "IMPS";
  const amountInRupee = paiseToRupee(amount);

  console.log(amountInRupee, "amountInRupee");

  try {
    const response = await csplClient.post(
      "fi/dmt/transfer",
      {
        transactionId: client_referenceId,
        customerMobileNo: mobileNumber,
        merchantMobileNo: merchantMobileNumber,
        customerName: customerName,

        beneName: beneficiaryName,
        beneAccountNo: beneficiaryAccount,
        beneIfscCode: beneficiaryIfsc,
        amount: String(amountInRupee), //rupee

        transferMode: transferMode,
        otp: otp,
        otpRefrenceId: tOtpRequestId,
        latitude: String(latitude),
        longitude: String(longitude),
        publicIp: publicIp,
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
      response?.data?.data?.statusCode === "DB0031" &&
      response?.data?.data?.status === 1;

    let providerStatus = isSuccess ? "SUCCESS" : "FAILED";

    if (providerStatus !== "SUCCESS") {
      throw {
        providerStatus: providerStatus,
        message: response?.data?.message || response?.data?.description,
        reason: response?.data?.data?.description,
        fullResponse: response?.data,
      };
    }

    await NobleDmtLog.create({
      providerTxnId: response?.data?.txn_ref || undefined,
      serviceCategory: "DMT",
      userId: userId,
      type: "FUND-TRANSFER",
      referenceId: client_referenceId,
      providerName: "NOBLE_FINO",
      endPoint: "fi/dmt/transfer",
      method: "POST",
      request: {
        transactionId: client_referenceId,
        customerMobileNo: mobileNumber,
        merchantMobileNo: merchantMobileNumber,
        customerName: customerName,

        beneName: beneficiaryName,
        beneAccountNo: beneficiaryAccount,
        beneIfscCode: beneficiaryIfsc,
        amount: amountInRupee, //rupee

        transferMode: transferMode,
        otp: otp,
        otpRefrenceId: tOtpRequestId,
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
      type: "FUND-TRANSFER",
      referenceId: client_referenceId,
      providerName: "NOBLE_FINO",
      endPoint: "fi/dmt/transfer",
      method: "POST",
      request: {
        transactionId: client_referenceId,
        customerMobileNo: mobileNumber,
        merchantMobileNo: merchantMobileNumber,
        customerName: customerName,

        beneName: beneficiaryName,
        beneAccountNo: beneficiaryAccount,
        beneIfscCode: beneficiaryIfsc,
        amount: amountInRupee, //rupee

        transferMode: transferMode,
        otp: otp,
        otpRefrenceId: tOtpRequestId,
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

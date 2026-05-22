const csplClient = require("../../../../cspl/cspl.client");
const NobleAepsLogs = require("../../../../../models/nobleAepsLogsModel");

exports.agentOnboard = async ({
  client_referenceId, //auto genertae
  userId,
  agentCode,
  requestId,
  channel,
  ipAddress,

  firstName,
  middleName,
  lastName,
  email,
  mobileNumber,

  aadhaar,
  panNumber,
  dob,

  address,
  agentStateCode,
  city,
  pincode,
  bankName,
  bankAccountNumber,
  bankIfsc,
  shopName,
  shopAddress,
  shopStateCode,
  shopCity,
  shopPincode,
  shopLongitude,
  shopLatitude,
}) => {
  console.log(String(shopLatitude), "latitude");
  console.log(String(shopLongitude), "longitude");

  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  const isPhysicalVerified = "YES";
  const ipAddressStatic = "182.68.187.62";
  try {
    const response = await csplClient.post(
      "e2/aeps/agent-onboarding",
      {
        channel: channel,
        ipAddress: ipAddressStatic,
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        mobileNumber: mobileNumber,
        email: email,
        panNumber: panNumber,
        aadhaarNumber: aadhaar,
        dob: dob,
        agentCode: agentCode,
        agentAddress: address,
        agentStateCode: agentStateCode,
        agentCity: city,
        agentPinCode: pincode,
        agentBankName: bankName,
        agentBankAccountNumber: bankAccountNumber,
        agentBankIFSC: bankIfsc,
        shopName: shopName,
        shopAddress: shopAddress,
        shopStateCode: shopStateCode,
        shopCity: shopCity,
        shopPinCode: shopPincode,
        shopLatitude: String(shopLatitude),
        shopLongitude: String(shopLongitude),
        isPhysicalVerified: isPhysicalVerified,
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
      response?.data?.data?.status === 1 ||
      response?.data?.data?.statusCode === "AG00001" ||
      response?.data?.data?.statusCode === "AG0001";

    let providerStatus = isSuccess ? "SUCCESS" : "FAILED";

    if (providerStatus !== "SUCCESS") {
      throw {
        providerStatus: providerStatus,
        message: response?.data?.data?.description || response?.data?.message,
        fullResponse: response?.data,
      };
    }

    await NobleAepsLogs.create({
      providerTxnId: response?.data?.txn_ref || undefined,
      userId: userId,
      referenceId: client_referenceId,
      type: "AEPS-ONBOARD",
      providerName: "NOBLE",
      endPoint: "e2/aeps/agent-onboarding",
      method: "POST",
      request: {
        channel: channel,
        ipAddress: ipAddress,
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        mobileNumber: mobileNumber,
        email: email,
        panNumber: panNumber,
        aadhaarNumber: aadhaar,
        dob: dob,
        agentCode: agentCode,
        agentAddress: address,
        agentStateCode: agentStateCode,
        agentCity: city,
        agentPinCode: pincode,
        agentBankName: bankName,
        agentBankAccountNumber: bankAccountNumber,
        agentBankIFSC: bankIfsc,
        shopName: shopName,
        shopAddress: shopAddress,
        shopStateCode: shopStateCode,
        shopCity: shopCity,
        shopPinCode: shopPincode,
        shopLatitude: String(shopLatitude),
        shopLongitude: String(shopLongitude),
        isPhysicalVerified: isPhysicalVerified,
      },

      response: response?.data,
      providerStatus: providerStatus,
      responseTime,
    });

    return response?.data;
  } catch (error) {
    console.log("API Error Response:", error?.response?.data || error?.message);

    await NobleAepsLogs.create({
      providerTxnId: error?.response?.data?.txn_ref || undefined,
      userId: userId,
      referenceId: client_referenceId,
      type: "AEPS-ONBOARD",
      providerName: "NOBLE",
      endPoint: "e2/aeps/agent-onboarding",
      method: "POST",
      request: {
        channel: channel,
        ipAddress: ipAddress,
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        mobileNumber: mobileNumber,
        email: email,
        panNumber: panNumber,
        aadhaarNumber: aadhaar,
        dob: dob,
        agentCode: agentCode,
        agentAddress: address,
        agentStateCode: agentStateCode,
        agentCity: city,
        agentPinCode: pincode,
        agentBankName: bankName,
        agentBankAccountNumber: bankAccountNumber,
        agentBankIFSC: bankIfsc,
        shopName: shopName,
        shopAddress: shopAddress,
        shopStateCode: shopStateCode,
        shopCity: shopCity,
        shopPinCode: shopPincode,
        shopLatitude: String(shopLatitude),
        shopLongitude: String(shopLongitude),
        isPhysicalVerified: isPhysicalVerified,
      },
      response: error?.fullResponse ||
        error?.response?.data || { message: error?.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });
    throw error;
  }
};

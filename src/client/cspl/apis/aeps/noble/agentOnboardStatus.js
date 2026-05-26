const csplClient = require("../../../../cspl/cspl.client");
const NobleAepsLogs = require("../../../../../models/nobleAepsLogsModel");

exports.agentOnboardStatus = async ({
  client_referenceId, //auto genertae
  userId,
  requestId,
  agentCode,
  panNumber,
}) => {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();

  try {
    const response = await csplClient.post(
      "e2/aeps/agent-onboarding-status",
      {
        agentCode: agentCode,
        panNumber: panNumber,
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
      response?.data?.data?.status === 1 &&
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
      type: "ONBOARD-STATUS-CHECK",
      providerName: "NOBLE",
      endPoint: "e2/aeps/agent-onboarding-status",
      method: "POST",
      request: {
        agentCode: agentCode,
        panNumber: panNumber,
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
      type: "ONBOARD-STATUS-CHECK",
      providerName: "NOBLE",
      endPoint: "e2/aeps/agent-onboarding-status",
      method: "POST",
      request: {
        agentCode: agentCode,
        panNumber: panNumber,
      },
      response: error?.fullResponse ||
        error?.response?.data || { message: error?.message },
      providerStatus: "FAILED",
      responseTime: Date.now() - startTime,
    });
    throw error;
  }
};

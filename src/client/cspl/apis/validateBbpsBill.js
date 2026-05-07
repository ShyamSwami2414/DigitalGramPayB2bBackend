const { generateRequestId } = require("../../../utils/requestIdGenerator");
const csplClient = require("../cspl.client");

exports.validateBbpsBill = async ({ billerId, paramName, paramValue }) => {
  const requestId = generateRequestId();
  const timestamp = new Date().toISOString();
  try {
    const response = await csplClient.post(
      "bbps/billvalidate",
      {
        billerId,
        paramName,
        paramValue,
      },
      {
        headers: {
          "X-TIMESTAMP": timestamp,
          "X-REQUEST-ID": requestId,
          "X-API-KEY": process.env.CSPL_API_KEY,
          "X-Forwarded-For": process.env.SERVER_IP,
        },

        // Accept any status code < 500 as "valid" so Axios doesn't throw
        validateStatus: (status) => status < 500,
      },
    );

    console.log(response?.data, "response");

    return response?.data;
  } catch (error) {
    console.log("API Error Response:", error.response?.data || error.message);
    throw error;
  }
};

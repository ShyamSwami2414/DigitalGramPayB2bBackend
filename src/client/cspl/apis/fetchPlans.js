const { generateRequestId } = require("../../../utils/requestIdGenerator");
const csplClient = require("../cspl.client");

exports.fetchPlans = async (operator_code, circle_id) => {
  const requestId = generateRequestId();
  const timestamp = new Date().toISOString();

  const response = await csplClient.post(
    "mobile-plan-fetch",
    { operator_code, circle_id },
    {
      headers: {
        "X-TIMESTAMP": timestamp,
        "X-REQUEST-ID": requestId,
        "X-API-KEY": process.env.CSPL_API_KEY,
        "X-Forwarded-For": process.env.SERVER_IP,
      },
    },
  );

  return response?.data;
};

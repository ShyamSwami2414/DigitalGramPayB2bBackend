const {
  generateUniqueRefernceId,
} = require("../../../utils/generateUniqueReferenceId");
const { generateRequestId } = require("../../../utils/requestIdGenerator");
const csplClient = require("../cspl.client");

exports.doRecharge = async (amount, operatorCode, number, billerMode) => {
  const requestId = generateRequestId();
  const client_referenceId = generateUniqueRefernceId();

  const timestamp = new Date().toISOString();

  const response = await csplClient.post(
    "mobile-prepaid-Recharg",
    { amount, client_referenceId, operatorCode, number, billerMode },
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

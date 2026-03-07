const { generateRequestId } = require("../../../utils/requestIdGenerator");
const csplClient = require("../cspl.client");

exports.mobileVerify = async (mobile) => {
  const requestId = generateRequestId();
  const timestamp = new Date().toISOString();

  const response = await csplClient.post(
    "mobile-verify",
    { mobile },
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

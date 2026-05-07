const ApiLogs = require("../models/apiLogsModel");

const updateApiLog = async (req, response, status) => {
  try {
    if (!req.apiLogId) return;

    await ApiLogs.findByIdAndUpdate(req.apiLogId, {
      response,
      status,
    });
  } catch (error) {
    console.error("API log update failed", error);
  }
};

module.exports = updateApiLog;
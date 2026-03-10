const ApiLogs = require("../models/apiLogsModel");

const apiLogger = async (req, res, next) => {
  try {

    const log = await ApiLogs.create({
      endPoint: req.originalUrl,
      method: req.method,
      request: {
        body: req.body,
        query: req.query,
        params: req.params,
      },
      status: "pending",
    });

    req.apiLogId = log._id;

    // [IMPROVEMENT] capture response

    const originalJson = res.json.bind(res);

    res.json = async (body) => {

      try {

        await ApiLogs.findByIdAndUpdate(req.apiLogId, {
          response: body,
          status: "completed",
          statusCode: res.statusCode,
        });

      } catch (err) {}

      return originalJson(body);
    };

    next();

  } catch (error) {
    next();
  }
};

module.exports = apiLogger;
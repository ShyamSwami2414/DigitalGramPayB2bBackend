const fs = require("fs");
const path = require("path");

exports.logError = async ({
  title = "ERROR",
  error,
  req = null,
}) => {
  try {
    const logDir = path.join(__dirname, "../logs");

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }

    const logFile = path.join(logDir, "error.log");

    const logText = `
==================================================

TIME:
${new Date().toISOString()}

TITLE:
${title}

MESSAGE:
${error?.message}

STACK:
${error?.stack}

ROUTE:
${req?.originalUrl}

METHOD:
${req?.method}

BODY:
${JSON.stringify(req?.body, null, 2)}

PARAMS:
${JSON.stringify(req?.params, null, 2)}

QUERY:
${JSON.stringify(req?.query, null, 2)}

FULL ERROR:
${JSON.stringify(
  error,
  Object.getOwnPropertyNames(error),
  2,
)}

==================================================
`;

    fs.appendFileSync(logFile, logText);
  } catch (loggerError) {
    console.error("LOGGER FAILED", loggerError);
  }
};
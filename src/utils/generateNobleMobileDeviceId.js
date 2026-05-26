const UAParser = require("ua-parser-js");

const getMobileDeviceId = (userAgent = "") => {
  const parser = new UAParser(userAgent);

  const result = parser.getResult();

  return `${result.browser.name || "UnknownBrowser"}-${
    result.os.name || "UnknownOS"
  }-${result.device.type || "desktop"}`;
};

module.exports = getMobileDeviceId;

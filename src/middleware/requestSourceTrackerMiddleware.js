exports.getPlatform = (req) => {
  const userAgent = req.headers["user-agent"]?.toLowerCase() || "";

  // API clients
  if (
    userAgent.includes("postman") ||
    userAgent.includes("insomnia") ||
    userAgent.includes("curl") ||
    req.headers["x-api-key"]
  ) {
    return "API";
  }

  // Mobile apps
  if (
    userAgent.includes("android") ||
    userAgent.includes("iphone") ||
    userAgent.includes("okhttp") ||
    userAgent.includes("reactnative")
  ) {
    return "MOBILE";
  }

  // Browser/Web
  return "WEB";
};



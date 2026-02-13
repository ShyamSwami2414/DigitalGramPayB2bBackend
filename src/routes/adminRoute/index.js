const apiPrefix = "/admin";
console.log("Admin Route Index Loaded");

module.exports = (app) => {
  app.use(`/`, require("./adminAuthRoute"));
  app.use(`${apiPrefix}/role`, require("./roleRoute"));
  app.use(`${apiPrefix}/kyc`, require("./kycRoute"));
  app.use(`${apiPrefix}/package`, require("./packageRoute"));
};

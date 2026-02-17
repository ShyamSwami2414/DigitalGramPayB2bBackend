const apiPrefix = "/admin";
console.log("Admin Route Index Loaded");

module.exports = (app) => {
  app.use(`/`, require("./adminAuthRoute"));
  app.use(`${apiPrefix}/role`, require("./roleRoute"));
  app.use(`${apiPrefix}/kyc`, require("./kycRoute"));
  app.use(`${apiPrefix}/package`, require("./packageRoute"));
  app.use(`${apiPrefix}/service`, require("./serviceRoute"));
  app.use(`${apiPrefix}/user`, require("./userRoute"));
  app.use(`${apiPrefix}/charge`, require("./chargeRoute"));
  app.use(`${apiPrefix}/userRequest`, require("./userRequestRoute"));
};

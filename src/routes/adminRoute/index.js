const apiPrefix = "/admin";
console.log("Admin Route Index Loaded");

module.exports = (app) => {
  app.use(`/`, require("./adminAuthRoute"));
  app.use(`${apiPrefix}/role`, require("./roleRoute"));
};

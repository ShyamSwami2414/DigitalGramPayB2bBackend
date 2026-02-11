const apiPrefix = "/admin";
module.exports = (app) => {
  app.use(`${apiPrefix}/auth`, require("./adminAuthRoute"));
};

const apiPrefix = "/user";
module.exports = (app) => {
    app.use(`/`, require("./userAuthRoute"));
    app.use(`${apiPrefix}/role`, require("./roleRoute"));

};

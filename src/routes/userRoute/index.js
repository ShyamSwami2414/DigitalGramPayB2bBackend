const apiPrefix = "/user";
module.exports = (app) => {
    app.use(`${apiPrefix}/auth`, require("./userAuthRoute"));

};

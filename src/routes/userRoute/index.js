const apiPrefix = "/user";
module.exports = (app) => {
    app.use(`/`, require("./userAuthRoute"));
    app.use(`${apiPrefix}/role`, require("./roleRoute"));
    app.use(`${apiPrefix}/kyc`, require("./kycRoute"));
    app.use(`${apiPrefix}/user`, require("./userRoute"));
    app.use(`${apiPrefix}/package`, require("./packageRoute"));
    app.use(`${apiPrefix}/offlineTopup`, require("./offlineTopupRequestRoute"));
    app.use(`${apiPrefix}/topupBank`, require("./topupBankRoute"));

};

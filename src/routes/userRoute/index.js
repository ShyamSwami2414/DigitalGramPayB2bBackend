const apiPrefix = "/user";
module.exports = (app) => {
  app.use(`/`, require("./userAuthRoute"));
  app.use(`${apiPrefix}/role`, require("./roleRoute"));
  app.use(`${apiPrefix}/kyc`, require("./kycRoute"));
  app.use(`${apiPrefix}/user`, require("./userRoute"));
  app.use(`${apiPrefix}/package`, require("./packageRoute"));
  app.use(`${apiPrefix}/offlineTopup`, require("./offlineTopupRequestRoute"));
  app.use(`${apiPrefix}/topupBank`, require("./topupBankRoute"));
  app.use(`${apiPrefix}/wallet`, require("./walletRoute"));
  app.use(`${apiPrefix}/aepsPayoutBank`, require("./aepsPayoutBankRoute"));
  app.use(`${apiPrefix}/enquiry`, require("./enquiryRoute"));
  app.use(`${apiPrefix}/support`, require("./supportRoute"));
  app.use(`${apiPrefix}/service`, require("./serviceRoute"));
  app.use(`${apiPrefix}/accountWhitelist`, require("./accountWhitelistRoute"));
  app.use(`${apiPrefix}/order`, require("./orderRoute"));
  app.use(`${apiPrefix}/shopping`, require("./ecommerceRoute"));
  app.use(`${apiPrefix}/offlineService`, require("./offlineServiceRoute"));
  app.use(
    `${apiPrefix}/offlineServiceRequest`,
    require("./offlineServiceRequestRoute"),
  );
  app.use(`${apiPrefix}/recharge`, require("./rechargeRoute"));
  app.use(`${apiPrefix}/bbps`, require("./billPaymentRoute"));
  app.use(`${apiPrefix}/userWalletRefill`, require("./userWalletRefillRoute"));

  app.use(`${apiPrefix}/coupon`, require("./couponRoute"));
  app.use(`${apiPrefix}/commissionPlan`, require("./commissionPlanRoute"));
  app.use(`${apiPrefix}/notification`, require("./notificationRoute"));
  app.use(`${apiPrefix}/banner`, require("./bannerRoute"));
  app.use(`${apiPrefix}/stateCity`, require("./stateCityRoute"));
  app.use(`${apiPrefix}/globalBank`, require("./globalBanksRoute"));
  app.use(`${apiPrefix}/walletLedger`, require("./walletLedgerRoute"));
  app.use(`${apiPrefix}/rechargeReport`, require("./rechargeReportRoute"));
  app.use(`${apiPrefix}/bbpsReport`, require("./billPaymentReportRoute"));
  app.use(`${apiPrefix}/dmtReport`, require("./dmtReportRoute"));
  app.use(`${apiPrefix}/search`, require("./transactionSearchRoute"));
  app.use(`${apiPrefix}/charge`, require("./idChargeRequest"));
  app.use(`${apiPrefix}/policy`, require("./policyRoute"));
};

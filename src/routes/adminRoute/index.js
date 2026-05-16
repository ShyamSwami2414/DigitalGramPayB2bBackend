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
  app.use(`${apiPrefix}/fundRequest`, require("./fundRequestRoute"));
  app.use(`${apiPrefix}/setting`, require("./settingRoute"));
  app.use(`${apiPrefix}/logs`, require("./loginLogsRoute"));
  app.use(`${apiPrefix}/topupBank`, require("./walletTopupBankRoute"));
  app.use(`${apiPrefix}/userWallet`, require("./userWallet"));

  app.use(`${apiPrefix}/support`, require("./supportRoute"));
  app.use(`${apiPrefix}/enquiry`, require("./enquiryRoute"));
  app.use(
    `${apiPrefix}/accountWhitelistRequest`,
    require("./accountWhitelistRequestRoute"),
  );
  app.use(`${apiPrefix}/ecommerce`, require("./ecommerceRoute"));
  app.use(`${apiPrefix}/order`, require("./orderRoute"));
  app.use(`${apiPrefix}/permission`, require("./permissionRoute"));
  app.use(`${apiPrefix}/employee`, require("./employeeRoute"));
  app.use(`${apiPrefix}/walletLedger`, require("./walletLedgerRoute"));
  app.use(`${apiPrefix}/document`, require("./documentRoute"));
  app.use(`${apiPrefix}/field`, require("./fieldRoute"));
  app.use(`${apiPrefix}/offlineService`, require("./offlineServiceRoute"));
  app.use(`${apiPrefix}/onlineService`, require("./onlineServiceRoute"));
  app.use(
    `${apiPrefix}/offlineServiceRequest`,
    require("./offlineServiceRequestRoute"),
  );
  app.use(`${apiPrefix}/bbpsCategory`, require("./bbpsCategoryRoute"));
  app.use(`${apiPrefix}/operator`, require("./operatorRoute"));
  app.use(`${apiPrefix}/commission`, require("./commissionRoute"));
  app.use(`${apiPrefix}/coupon`, require("./couponRoute"));
  // app.use(`${apiPrefix}/report`, require("./reportRoute"));
  app.use(`${apiPrefix}/rechargeReport`, require("./rechargeReportRoute"));
  app.use(`${apiPrefix}/bbpsReport`, require("./bbpsReportRoute"));
  app.use(`${apiPrefix}/aepsReport`, require("./instantAepsReportRoute"));
  app.use(`${apiPrefix}/eAepsReport`, require("./ekoAepsReportRoute"));
  app.use(`${apiPrefix}/dmtReport`, require("./nobleDmtReportRoute"));
  app.use(`${apiPrefix}/search`, require("./transactionSearchRoute"));
  app.use(
    `${apiPrefix}/aepsPayoutReport`,
    require("./sozoAepsPayoutReportRoute"),
  );

  app.use(
    `${apiPrefix}/xpressPayoutReport`,
    require("./sozoXpressPayoutReportRoute"),
  );

  app.use(`${apiPrefix}/notification`, require("./notificationRoute"));
  app.use(`${apiPrefix}/banner`, require("./bannerRoute"));
  app.use(`${apiPrefix}/dashboard`, require("./dashboardRoute"));

  app.use(
    `${apiPrefix}/walletHistory`,
    require("./userWalletReportRoute"),
  );

  app.use(`${apiPrefix}/policy`, require("./policyRoute"));
  app.use(`${apiPrefix}/serviceRequest`, require("./serviceRequestRoute"));

  app.use(`${apiPrefix}/commissionReport`, require("./commissionReportRoute"));

  //aeps1
  app.use(
    `${apiPrefix}/aepsPayoutBankRequest`,
    require("./sozoAepsPayoutBankRequestRoute"),
  );
  //aeps2
};

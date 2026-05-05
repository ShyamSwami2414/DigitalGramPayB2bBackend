const apiPrefix = "/api1/user";

module.exports = (app) => {
  app.use(`/api1`, require("./userAuthRoute"));

  app.use(`${apiPrefix}/role`, require("./roleRoute"));
  app.use(`${apiPrefix}/kyc`, require("./kycRoute"));
  app.use(`${apiPrefix}/user`, require("./userRoute"));
  app.use(`${apiPrefix}/package`, require("./packageRoute"));
  app.use(`${apiPrefix}/offlineTopup`, require("./offlineTopupRequestRoute"));
  app.use(`${apiPrefix}/topupBank`, require("./topupBankRoute"));
  app.use(`${apiPrefix}/wallet`, require("./walletRoute"));

  app.use(`${apiPrefix}/enquiry`, require("./enquiryRoute"));
  app.use(`${apiPrefix}/support`, require("./supportRoute"));
  app.use(`${apiPrefix}/service`, require("./serviceRoute"));
  app.use(`${apiPrefix}/accountWhitelist`, require("./accountWhitelistRoute"));
  app.use(`${apiPrefix}/order`, require("./orderRoute"));
  app.use(`${apiPrefix}/aeps`, require("./ekoAepsRoute"));
  app.use(`${apiPrefix}/aepsReport`, require("./ekoAepsReportRoute"));
  app.use(`${apiPrefix}/state`, require("./ekoStateRoute"));
  app.use(`${apiPrefix}/ebank`, require("./ekoBankList"));
  app.use(`${apiPrefix}/shopping`, require("./ecommerceRoute"));
  app.use(`${apiPrefix}/offlineService`, require("./offlineServiceRoute"));
  app.use(`${apiPrefix}/onlineService`, require("./onlineServiceRoute"));
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
  app.use(`${apiPrefix}/dmtReport`, require("./nobleDmtReportRoute"));
  app.use(`${apiPrefix}/search`, require("./transactionSearchRoute"));
  app.use(`${apiPrefix}/charge`, require("./idChargeRequest"));
  app.use(`${apiPrefix}/serviceRequest`, require("./serviceRequestRoute"));
  app.use(`${apiPrefix}/policy`, require("./policyRoute"));
  app.use(`${apiPrefix}/aepsbank`, require("./instantAepsBankRoute"));

  app.use(`${apiPrefix}/aepsInstant`, require("./instantAepsRoute"));
  app.use(`${apiPrefix}/insAepsReport`, require("./instantAepsReportRoute"));

  app.use(`${apiPrefix}/dmt`, require("./nobleFinoDmtRoute"));
  app.use(`${apiPrefix}/dmt-ben`, require("./nobleDmtBeneficiaryRoute"));

  app.use(
    `${apiPrefix}/aepsPayoutBank`,
    require("./sozoAepsPayoutBankRequestRoute"),
  );
  app.use(`${apiPrefix}/payout-bank`, require("./sozoAepsPayoutBankRoute"));
  app.use(`${apiPrefix}/aepsPayout`, require("./sozoAepsPayoutRoute"));
  app.use(
    `${apiPrefix}/aepsPayoutReport`,
    require("./sozoAepsPayoutReportRoute"),
  );
  app.use(
    `${apiPrefix}/xpressPayoutBank`,
    require("./sozoXpressPayoutBankRoute"),
  );
  app.use(`${apiPrefix}/xpressPayout`, require("./sozoXpressPayoutRoute"));
  app.use(
    `${apiPrefix}/xpressPayoutReport`,
    require("./sozoXpressPayoutReportRoute"),
  );
  app.use(`${apiPrefix}/dashboard`, require("./dashboardRoute"));
};

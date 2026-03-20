const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getMyLastRechargeHistory,
  getCompleteRechargeReport
} = require("../../controllers/userController/rechargeReportController");

const router = express.Router();

//get my last 5 recharge transaction
router.get(
  "/my-recharge-history",
  authenticateUser,
  checkUserPaymentAndKYC,
  getMyLastRechargeHistory,
);

//get all recharge transaction of me and my downline
router.get(
  "/complete-recharge-report",
  authenticateUser,
  checkUserPaymentAndKYC,
  getCompleteRechargeReport,
);

module.exports = router;

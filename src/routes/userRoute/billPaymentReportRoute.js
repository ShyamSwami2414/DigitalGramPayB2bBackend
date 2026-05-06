const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getMyLastBillPaymentHistory,
  getBillPaymentStats,
  getCompleteBillPaymentReport,
  getBbpsReportById,
} = require("../../controllers/userController/billPaymentReportController");

const router = express.Router();

//get my last 5 recharge transaction
router.get(
  "/my-bbps-history",
  authenticateUser,
  checkUserPaymentAndKYC,
  getMyLastBillPaymentHistory,
);

router.get(
  "/bbps-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  getBillPaymentStats,
);

//get all recharge transaction of me and my downline
router.get(
  "/complete-bbps-report",
  authenticateUser,
  checkUserPaymentAndKYC,
  getCompleteBillPaymentReport,
);

router.get(
  "/report/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  getBbpsReportById,
);

module.exports = router;

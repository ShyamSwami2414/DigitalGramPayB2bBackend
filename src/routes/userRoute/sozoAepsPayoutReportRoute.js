const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  //
  getMyLastPayoutHistory,
  getPayoutStats,
  getCompletePayoutReport,
  getPayoutReportById,
} = require("../../controllers/userController/sozoAepsPayoutReportController");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");

const router = express.Router();

// router.get("/list-all", authenticateUser, myAllTransaction);

//get my last 5 payout transaction
router.get(
  "/my-payout-history",
  authenticateUser,
  checkUserPaymentAndKYC,
  getMyLastPayoutHistory,
);

router.get(
  "/payout-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  getPayoutStats,
);

//get all aeps transaction of me and my downline
router.get(
  "/complete-payout-report",
  authenticateUser,
  checkUserPaymentAndKYC,
  getCompletePayoutReport,
);

router.get(
  "/report/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  getPayoutReportById,
);

module.exports = router;

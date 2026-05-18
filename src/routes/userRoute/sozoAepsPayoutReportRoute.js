const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  myAllTransaction,
  getMyLastPayoutHistory,
  getPayoutStats,
  getCompletePayoutReport,
  getPayoutReportById,
} = require("../../controllers/userController/sozoAepsPayoutReportController");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");

const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

router.get("/list-all", authenticateUser, asyncHandler(myAllTransaction));

//get my last 5 payout transaction
router.get(
  "/my-payout-history",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getMyLastPayoutHistory),
);

router.get(
  "/payout-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getPayoutStats),
);

//get all aeps transaction of me and my downline
router.get(
  "/complete-payout-report",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getCompletePayoutReport),
);

router.get(
  "/report/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getPayoutReportById),
);

module.exports = router;

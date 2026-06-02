const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");

const {
  getTopupStats,
  getServiceMonthlyStats,
  getPerformanceStats,
  getVolumeAnalytics,
  latestTransactions,
  transactionStats,
  creditDebitStats,
} = require("../../controllers/userController/dashboardController");

const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");
const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

router.get(
  "/topup-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getTopupStats),
);

router.get(
  "/payout-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getServiceMonthlyStats),
);

router.get(
  "/performance-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getPerformanceStats),
);

router.get(
  "/volume-analytics",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getVolumeAnalytics),
);

//for app

router.get(
  "/latest-transaction",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(latestTransactions),
);

//for app

router.get(
  "/card-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(transactionStats),
);

//for app

router.get(
  "/credit-debit-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(creditDebitStats),
);

module.exports = router;

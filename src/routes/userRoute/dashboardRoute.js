const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");

const {
  getTopupStats,
  getPayoutMonthlyStats,
  getPerformanceStats
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
  asyncHandler(getPayoutMonthlyStats),
);

router.get(
  "/performance-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getPerformanceStats),
);

module.exports = router;

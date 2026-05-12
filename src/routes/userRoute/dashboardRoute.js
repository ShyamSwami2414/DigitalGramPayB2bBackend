const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");

const {
  getTopupStats,
  getPayoutMonthlyStats,
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

module.exports = router;

const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");

const {
  getTopupStats,
  getPayoutMonthlyStats,
} = require("../../controllers/userController/dashboardController");

const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");

const router = express.Router();

router.get(
  "/topup-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  getTopupStats,
);

router.get(
  "/payout-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  getPayoutMonthlyStats,
);

module.exports = router;

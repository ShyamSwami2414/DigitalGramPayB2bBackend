const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");

const {
  initiateXpressPayout,
  checkPayoutStatus,
} = require("../../controllers/userController/sozoXpressPayoutController");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");
const apiLogger = require("../../middleware/apiLogger");
const router = express.Router();

router.post(
  "/initiate-payout-transfer",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  initiateXpressPayout,
);

router.post(
  "/check-payout-status",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  checkPayoutStatus,
);

module.exports = router;

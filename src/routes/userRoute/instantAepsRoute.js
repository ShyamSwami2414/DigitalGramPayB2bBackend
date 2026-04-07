const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  registerOutlet,
  getBiometricKycStatus,
  completetBiometricKyc,
  dailyAepsLogin,
  balanceEnquiry,
  miniStatement,
} = require("../../controllers/userController/instantAepsController");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");
const apiLogger = require("../../middleware/apiLogger");
const router = express.Router();

// get all list whether approved or not
router.post(
  "/registerOutlet",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  registerOutlet,
);

router.get(
  "/biometric-kyc-status",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  getBiometricKycStatus,
);

router.post(
  "/biometric-kyc",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  completetBiometricKyc,
);

router.post(
  "/daily-login",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  dailyAepsLogin,
);

router.post(
  "/balance-enquiry",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  balanceEnquiry,
);

router.post(
  "/mini-statement",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  miniStatement,
);

module.exports = router;

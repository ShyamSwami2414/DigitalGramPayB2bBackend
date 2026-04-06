const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  registerOutlet,
  getBiometricKycStatus,
  completetBiometricKyc,
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

module.exports = router;

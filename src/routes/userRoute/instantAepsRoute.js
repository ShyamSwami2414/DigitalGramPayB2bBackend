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
  cashWithdraw,
} = require("../../controllers/userController/instantAepsController");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");
const validatePipeline = require("../../middleware/pipelineCheckMiddleware");
const apiLogger = require("../../middleware/apiLogger");
const checkAepsSession = require("../../middleware/instantAepsOutletAuth");
const router = express.Router();
router.use(validatePipeline("aeps1"));

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
  // apiLogger,
  completetBiometricKyc,
);

router.get(
  "/aeps-status",
  authenticateUser,
  checkUserPaymentAndKYC,
  checkAepsSession,
  (req, res) => {
    res.json({
      success: true,
      status: "SUCCESS",
      message: "AEPS session active",
      code: "LOGIN_NOT_REQUIRED",
    });
  },
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
  checkAepsSession,
  apiLogger,
  balanceEnquiry,
);

router.post(
  "/mini-statement",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  checkAepsSession,
  apiLogger,
  miniStatement,
);

router.post(
  "/cash-withdraw",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  checkAepsSession,
  apiLogger,
  cashWithdraw,
);

module.exports = router;

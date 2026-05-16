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
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();
router.use(validatePipeline("aeps1"));

// get all list whether approved or not
router.post(
  "/registerOutlet",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(registerOutlet),
);

router.get(
  "/biometric-kyc-status",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(getBiometricKycStatus),
);

router.post(
  "/biometric-kyc",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  // apiLogger,
  asyncHandler(completetBiometricKyc),
);

router.get(
  "/aeps-status",
  authenticateUser,
  checkUserPaymentAndKYC,
  checkAepsSession,
  asyncHandler((req, res) => {
    res.json({
      success: true,
      status: "SUCCESS",
      message: "AEPS session active",
      code: "LOGIN_NOT_REQUIRED",
    });
  }),
);

router.post(
  "/daily-login",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(dailyAepsLogin),
);

router.post(
  "/balance-enquiry",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  checkAepsSession,
  apiLogger,
  asyncHandler(balanceEnquiry),
);

router.post(
  "/mini-statement",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  checkAepsSession,
  apiLogger,
  asyncHandler(miniStatement),
);

router.post(
  "/cash-withdraw",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  checkAepsSession,
  apiLogger,
  asyncHandler(cashWithdraw),
);

module.exports = router;

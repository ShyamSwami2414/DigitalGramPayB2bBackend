const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  onboardAepsUser,
  activateUser,
  generateKycOtp,
  verifyKycOtp,
  doEkycBiometric,
  dailyAepsLogin,
  doAepsTransaction,
} = require("../../controllers/userController/ekoAepsController");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");
const apiLogger = require("../../middleware/apiLogger");
const multerErrorHandler = require("../../middleware/multerErrorHandler");
const createUploader = require("../../middleware/uploadMiddleware");
const validatePipeline = require("../../middleware/pipelineCheckMiddleware");
const asyncHandler = require("../../utils/asyncHandler");
const checkAepsSession = require("../../middleware/ekoAepsOutletAuth");

const router = express.Router();
router.use(validatePipeline("aeps2"));

const upload = createUploader("ekoAepsActivateDocument", /jpeg|jpg|png/, 2048);

router.post(
  "/onboard-user",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(onboardAepsUser),
);

router.post(
  "/activate",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  multerErrorHandler(
    upload.fields([
      { name: "aadhaarFront", maxCount: 1 },
      { name: "aadhaarBack", maxCount: 1 },
      { name: "panCard", maxCount: 1 },
    ]),
  ),
  apiLogger,
  asyncHandler(activateUser),
);

router.post(
  "/generate-ekyc-otp",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(generateKycOtp),
);

router.post(
  "/verify-ekyc-otp",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(verifyKycOtp),
);

router.post(
  "/ekyc-biometric",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(doEkycBiometric),
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
  "/initiate-transaction",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(doAepsTransaction),
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

module.exports = router;

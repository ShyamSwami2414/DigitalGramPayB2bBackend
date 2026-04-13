const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  onboardAepsUser,
  activateUser,
  generateKycOtp,
  verifyKycOtp,
} = require("../../controllers/userController/ekoAepsController");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");
const apiLogger = require("../../middleware/apiLogger");
const multerErrorHandler = require("../../middleware/multerErrorHandler");
const createUploader = require("../../middleware/uploadMiddleware");

const router = express.Router();

const upload = createUploader("ekoAepsActivateDocument", /jpeg|jpg|png/, 2048);

router.post(
  "/onboard-user",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  onboardAepsUser,
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
  activateUser,
);

router.post(
  "/generate-ekyc-otp",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  generateKycOtp,
);

router.post(
  "/verify-ekyc-otp",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  verifyKycOtp,
);

module.exports = router;

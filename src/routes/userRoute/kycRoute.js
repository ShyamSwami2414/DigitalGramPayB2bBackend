const express = require("express");
const {
  offlineKycSubmission,
  onlineKycSubmission,
  sendAadharOtpForOnlineKyc,
  verifyAadharOtpForOnlineKyc,
} = require("../../controllers/userController/kycController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const createUploader = require("../../middleware/uploadMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const router = express.Router();

const kycUpload = createUploader("kyc", /jpeg|jpg|png|pdf/, 15);

router.post(
  "/offline-kyc-submission",
  authenticateUser,
  kycUpload.fields([
    { name: "aadharFile", maxCount: 1 },
    { name: "panFile", maxCount: 1 },
    { name: "shopImage", maxCount: 1 },
  ]),
  offlineKycSubmission,
);

router.post(
  "/send-aadhar-otp",
  authenticateUser,

  sendAadharOtpForOnlineKyc,
);

router.post(
  "/verify-aadhar-otp",
  authenticateUser,

  verifyAadharOtpForOnlineKyc,
);

router.post(
  "/online-kyc-submission",
  authenticateUser,

  kycUpload.fields([
    { name: "aadharFile", maxCount: 1 },
    { name: "panFile", maxCount: 1 },
    { name: "shopImage", maxCount: 1 },
  ]),
  onlineKycSubmission,
);

module.exports = router;

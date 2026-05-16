const express = require("express");
const {
  offlineKycSubmission,
  onlineKycSubmission,
  sendAadharOtpForOnlineKyc,
  verifyAadharOtpForOnlineKyc,
  reuploadKycSections,
  getSubmittedKyc,
} = require("../../controllers/userController/kycController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const createUploader = require("../../middleware/uploadMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const apiLogger = require("../../middleware/apiLogger");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

const kycUpload = createUploader("kyc", /jpeg|jpg|png|pdf/, 200); //kb

router.get("/submitted-kyc", authenticateUser, asyncHandler(getSubmittedKyc));

router.post(
  "/offline-kyc-submission",
  authenticateUser,
  kycUpload.fields([
    { name: "aadharFile", maxCount: 1 },
    { name: "panFile", maxCount: 1 },
    { name: "shopImage", maxCount: 1 },
    { name: "blankCheque", maxCount: 1 },
  ]),
  apiLogger,
  asyncHandler(offlineKycSubmission),
);

router.post(
  "/send-aadhar-otp",
  authenticateUser,
  apiLogger,
  asyncHandler(sendAadharOtpForOnlineKyc),
);

router.post(
  "/verify-aadhar-otp",
  authenticateUser,
  apiLogger,
  asyncHandler(verifyAadharOtpForOnlineKyc),
);

router.post(
  "/online-kyc-submission",
  authenticateUser,
  apiLogger,
  kycUpload.fields([
    { name: "aadharFile", maxCount: 1 },
    { name: "panFile", maxCount: 1 },
    { name: "shopImage", maxCount: 1 },
    { name: "blankCheque", maxCount: 1 },
  ]),
  asyncHandler(onlineKycSubmission),
);

router.post(
  "/reupload-kyc",
  authenticateUser,
  kycUpload.fields([
    { name: "aadharFile", maxCount: 1 },
    { name: "panFile", maxCount: 1 },
    { name: "shopImage", maxCount: 1 },
    { name: "blankCheque", maxCount: 1 },
  ]),
  apiLogger,
  asyncHandler(reuploadKycSections),
);

module.exports = router;

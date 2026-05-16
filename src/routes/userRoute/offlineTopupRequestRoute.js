const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");

const {
  getTopupRequestStats,
  getAllOfflineTopupRequests,
  addOfflineTopupRequest,
} = require("../../controllers/userController/offlineTopupRequestController");
const createUploader = require("../../middleware/uploadMiddleware");
const multerErrorHandler = require("../../middleware/multerErrorHandler");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");

const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

const upload = createUploader("paymentProof", /jpeg|jpg|png|pdf/, 2048);

router.get(
  "/offline-topup-requests-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getTopupRequestStats),
);

router.get(
  "/get-all-offline-topup-requests",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getAllOfflineTopupRequests),
);

router.post(
  "/add-offline-topup-request",
  authenticateUser,
  checkUserPaymentAndKYC,
  multerErrorHandler(upload.single("paymentProof")),
  idempotencyMiddleware,
  asyncHandler(addOfflineTopupRequest),
);

module.exports = router;

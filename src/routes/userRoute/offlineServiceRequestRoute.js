const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  createOfflineServiceRequest,
  listOfflineServiceRequests,
  getOfflineServiceRequestById,
} = require("../../controllers/userController/offlineServiceRequestController");
const createUploader = require("../../middleware/uploadMiddleware");
const multerErrorHandler = require("../../middleware/multerErrorHandler");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

const upload = createUploader("offlineServiceRequest", /jpeg|jpg|png|pdf/, 2048);

router.post(
  "/create-offline-service-request",
  authenticateUser,
  checkUserPaymentAndKYC,
  multerErrorHandler(upload.any()),
  asyncHandler(createOfflineServiceRequest),
);

router.get(
  "/fetch-offline-service-request",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(listOfflineServiceRequests),
);

router.get(
  "/fetch-offline-service-request/:id",
  authenticateUser,
  asyncHandler(getOfflineServiceRequestById),
);

module.exports = router;

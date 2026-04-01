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
const router = express.Router();

const upload = createUploader("offlineServiceRequest", /jpeg|jpg|png|pdf/, 15);

router.post(
  "/create-offline-service-request",
  authenticateUser,
  checkUserPaymentAndKYC,
  multerErrorHandler(upload.any()),
  createOfflineServiceRequest,
);

router.get(
  "/fetch-offline-service-request",
  authenticateUser,
  checkUserPaymentAndKYC,
  listOfflineServiceRequests,
);

router.get(
  "/fetch-offline-service-request/:id",
  authenticateUser,
  getOfflineServiceRequestById,
);

module.exports = router;

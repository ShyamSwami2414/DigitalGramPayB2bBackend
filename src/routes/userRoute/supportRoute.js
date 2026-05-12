const express = require("express");
const {
  createSupportRequest,
  getMySupportRequests,
  getTicketStats,
  getSupportRequestById,
} = require("../../controllers/userController/supportController");

const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/get-ticket-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getTicketStats),
);

router.get(
  "/my-support-request/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getSupportRequestById),
);

router.get(
  "/get-my-support-requests",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getMySupportRequests),
);

router.post(
  "/create-support-request",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(createSupportRequest),
);

module.exports = router;

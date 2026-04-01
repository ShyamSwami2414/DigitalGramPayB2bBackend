const express = require("express");
const {
  createSupportRequest,
  getMySupportRequests,
  getTicketStats,
  getSupportRequestById,
} = require("../../controllers/userController/supportController");

const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const router = express.Router();

router.get(
  "/get-ticket-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  getTicketStats,
);

router.get(
  "/my-support-request/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  getSupportRequestById,
);

router.get(
  "/get-my-support-requests",
  authenticateUser,
  checkUserPaymentAndKYC,
  getMySupportRequests,
);

router.post(
  "/create-support-request",
  authenticateUser,
  checkUserPaymentAndKYC,
  createSupportRequest,
);

module.exports = router;

const express = require("express");
const {
  getAllNotification,
} = require("../../controllers/userController/notificationController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/all-notifications",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getAllNotification),
);

module.exports = router;

const express = require("express");
const {
  getAllNotification,
} = require("../../controllers/userController/notificationController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const router = express.Router();

router.get(
  "/all-notifications",
  authenticateUser,
  checkUserPaymentAndKYC,
  getAllNotification,
);

module.exports = router;

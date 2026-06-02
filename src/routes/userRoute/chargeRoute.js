const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  calculateTotalCharges,
} = require("../../controllers/userController/chargeController");

const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const router = express.Router();
const asyncHandler = require("../../utils/asyncHandler");

router.get(
  "/calculate",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(calculateTotalCharges),
);

module.exports = router;

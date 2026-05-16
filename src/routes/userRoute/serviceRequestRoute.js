const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  addServiceRequest,
} = require("../../controllers/userController/serviceRequestController");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.post(
  "/add-service-request",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(addServiceRequest),
);

module.exports = router;

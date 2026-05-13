const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  completeCommissionReport,
  getCommissionReportStats,
} = require("../../controllers/userController/commissionReportController");

const asyncHandler = require("../../utils/asyncHandler");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getCommissionReportStats),
);

router.get(
  "/reports",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(completeCommissionReport),
);

module.exports = router;

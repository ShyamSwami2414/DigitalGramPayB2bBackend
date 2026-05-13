const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  completeCommissionReport,
} = require("../../controllers/adminController/commissionReportController");

const asyncHandler = require("../../utils/asyncHandler");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/reports",
  authenticateUser,
  authorizeRoles("admin"),
  asyncHandler(completeCommissionReport),
);

module.exports = router;

const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  getPayoutStats,
  getCompletePayoutReport,
  getPayoutReportById,
} = require("../../controllers/adminController/sozoXpressPayoutReportController");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/payout-stats",
  authenticateUser,
  authorizeRoles("admin"),
  getPayoutStats,
);

router.get(
  "/complete-payout-report",
  authenticateUser,
  authorizeRoles("admin"),
  getCompletePayoutReport,
);

router.get(
  "/report/:id",
  authenticateUser,
  authorizeRoles("admin"),
  getPayoutReportById,
);

module.exports = router;

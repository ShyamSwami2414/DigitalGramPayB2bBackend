const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getAepsStats,
  getCompleteAepsReport,
  getAepsReportById,
} = require("../../controllers/adminController/instantAepsReportControlleer");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/aeps-stats",
  authenticateUser,
  authorizeRoles("admin"),
  getAepsStats,
);

//get all aeps transaction of me and my downline
router.get(
  "/complete-aeps-report",
  authenticateUser,
  authorizeRoles("admin"),
  getCompleteAepsReport,
);

router.get(
  "/report/:id",
  authenticateUser,
  authorizeRoles("admin"),
  getAepsReportById,
);

module.exports = router;

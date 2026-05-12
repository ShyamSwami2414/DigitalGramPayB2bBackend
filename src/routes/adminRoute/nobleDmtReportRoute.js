const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getDmtStats,
  getCompleteDmtReport,
  getDmtReportById,
} = require("../../controllers/adminController/nobleDmtReportControllr");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/dmt-stats",
  authenticateUser,
  authorizeRoles("admin"),
  getDmtStats,
);

//get all aeps transaction of me and my downline
router.get(
  "/complete-dmt-report",
  authenticateUser,
  authorizeRoles("admin"),
  getCompleteDmtReport,
);

router.get(
  "/report/:id",
  authenticateUser,
  authorizeRoles("admin"),
  getDmtReportById,
);

module.exports = router;

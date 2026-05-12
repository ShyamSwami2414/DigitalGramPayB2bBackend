const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getDmtStats,
  getCompleteDmtReport,
  getDmtReportById,
} = require("../../controllers/adminController/nobleDmtReportControllr");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

router.get(
  "/dmt-stats",
  authenticateUser,
  authorizeRoles("admin"),
  asyncHandler(getDmtStats),
);

//get all aeps transaction of me and my downline
router.get(
  "/complete-dmt-report",
  authenticateUser,
  authorizeRoles("admin"),
  asyncHandler(getCompleteDmtReport),
);

router.get(
  "/report/:id",
  authenticateUser,
  authorizeRoles("admin"),
  asyncHandler(getDmtReportById),
);

module.exports = router;

const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getAepsStats,
  getCompleteAepsReport,
  getAepsReportById,
} = require("../../controllers/adminController/nobleAepsReportController");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

router.get(
  "/aeps-stats",
  authenticateUser,
  authorizeRoles("admin"),
  asyncHandler(getAepsStats),
);

//get all aeps transaction of me and my downline
router.get(
  "/complete-aeps-report",
  authenticateUser,
  authorizeRoles("admin"),
  asyncHandler(getCompleteAepsReport),
);

router.get(
  "/report/:id",
  authenticateUser,
  authorizeRoles("admin"),
  asyncHandler(getAepsReportById),
);

module.exports = router;

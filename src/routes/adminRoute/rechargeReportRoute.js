const express = require("express");
const {
  getRechargeStats,
  getRechargeReport,
  getRechargeReportById,
} = require("../../controllers/adminController/rechargeReportController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/recharge-service-stats",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("REPORTS"),
  asyncHandler(getRechargeStats),
);

router.get(
  "/recharge-service-report",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("REPORTS"),
  asyncHandler(getRechargeReport),
);

//report view by id
router.get(
  "/recharge-service-report/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("REPORTS"),
  asyncHandler(getRechargeReportById),
);

module.exports = router;

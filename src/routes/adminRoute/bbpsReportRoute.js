const express = require("express");
const {
  getBbpsStats,
  getBbpsReport,
  getBbpsReportById,
} = require("../../controllers/adminController/bbpsReportController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/bbps-service-stats",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("BBPS"),
  asyncHandler(getBbpsStats),
);

router.get(
  "/bbps-service-report",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("BBPS"),
  asyncHandler(getBbpsReport),
);

//report view by id
router.get(
  "/bbps-service-report/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("BBPS"),
  asyncHandler(getBbpsReportById),
);

module.exports = router;

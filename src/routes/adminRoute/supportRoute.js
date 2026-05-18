const express = require("express");
const router = express.Router();
const {
  getSupportRequests,
  getSupportStats,
  updateSupportStatus,
  getSupportRequestById,
  addRemark,
} = require("../../controllers/adminController/supportController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");

const asyncHandler = require("../../utils/asyncHandler");

router.get(
  "/support-stats",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SUPPORT"),
  asyncHandler(getSupportStats),
);

router.get(
  "/all-support-requests",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SUPPORT"),
  asyncHandler(getSupportRequests),
);

router.get(
  "/support-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SUPPORT"),
  asyncHandler(getSupportRequestById),
);

router.patch(
  "/update-support-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SUPPORT"),
  asyncHandler(updateSupportStatus),
);

router.patch(
  "/add-remark/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SUPPORT"),
  asyncHandler(addRemark),
);

module.exports = router;

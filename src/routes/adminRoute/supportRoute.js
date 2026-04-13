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

router.get(
  "/support-stats",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SUPPORT"),
  getSupportStats,
);

router.get(
  "/all-support-requests",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SUPPORT"),
  getSupportRequests,
);

router.get(
  "/support-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SUPPORT"),
  getSupportRequestById,
);

router.patch(
  "/update-support-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SUPPORT"),
  updateSupportStatus,
);

router.patch(
  "/add-remark/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SUPPORT"),
  addRemark,
);

module.exports = router;

const express = require("express");
const router = express.Router();

const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const {
  getPermissionList,
} = require("../../controllers/adminController/permissionController");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");

const asyncHandler = require("../../utils/asyncHandler");

router.get(
  "/permission-list",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("EMPLOYEE"),
  asyncHandler(getPermissionList),
);

module.exports = router;

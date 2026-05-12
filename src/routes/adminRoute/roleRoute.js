const express = require("express");
const {
  getUserRoles,
  createRole,
} = require("../../controllers/adminController/roleController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.post(
  "/create-role",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ROLE"),
  asyncHandler(createRole),
);
router.get(
  "/get-roles",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ROLE"),
  asyncHandler(getUserRoles),
);

module.exports = router;

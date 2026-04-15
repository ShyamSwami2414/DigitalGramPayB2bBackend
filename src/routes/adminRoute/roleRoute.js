const express = require("express");
const {
  getUserRoles,
  createRole,
} = require("../../controllers/adminController/roleController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const router = express.Router();

router.post(
  "/create-role",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ROLE"),
  createRole,
);
router.get(
  "/get-roles",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ROLE"),
  getUserRoles,
);

module.exports = router;

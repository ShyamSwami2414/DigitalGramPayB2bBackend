const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  getAccountWhitelistRequest,
  approveRejectRequest,
} = require("../../controllers/adminController/accountWhitelistRequestController");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const router = express.Router();

router.get(
  "/account-whitelist-requests",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ACCOUNT_WHITELIST"),
  getAccountWhitelistRequest,
);

router.patch(
  "/approve-reject-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ACCOUNT_WHITELIST"),
  approveRejectRequest,
);

module.exports = router;

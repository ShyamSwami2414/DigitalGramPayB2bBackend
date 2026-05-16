const express = require("express");
const {
  getCompleteUserWalletReportHistory,
} = require("../../controllers/adminController/userWalletReportController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/complete-history",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("WALLET"),
  asyncHandler(getCompleteUserWalletReportHistory),
);

module.exports = router;

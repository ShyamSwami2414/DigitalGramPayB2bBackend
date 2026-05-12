const express = require("express");
const {
  getCompleteHoldReleaseHistory,
} = require("../../controllers/adminController/holdReleaseHistoryController");
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
  asyncHandler(getCompleteHoldReleaseHistory),
);

module.exports = router;

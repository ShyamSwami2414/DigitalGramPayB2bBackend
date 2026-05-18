const express = require("express");
const {
  latestTransactions,
  transactionStatusStats,
  getDashboardOverview,
} = require("../../controllers/adminController/dashboardController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/latest-transaction",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("DASHBOARD"),
  asyncHandler(latestTransactions),
);

//status stats
router.get(
  "/transaction-stats",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("DASHBOARD"),
  asyncHandler(transactionStatusStats),
);

router.get(
  "/complete-overview",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("DASHBOARD"),
  asyncHandler(getDashboardOverview),
);

module.exports = router;

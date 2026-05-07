const express = require("express");
const {
  getDashboardOverview,
} = require("../../controllers/adminController/dashboardController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const router = express.Router();

router.get(
  "/complete-overview",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("DASHBOARD"),
  getDashboardOverview,
);

module.exports = router;

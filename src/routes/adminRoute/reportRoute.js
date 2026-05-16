const express = require("express");
const {
  getServiceWiseReport,
} = require("../../controllers/adminController/reportController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const router = express.Router();

// router.get(
//   "/service-wise-report",
//   authenticateUser,
//   authorizeRoles("admin"),
// checkAllowedPermission("REPORTS"),
//   getServiceWiseReport,
// );

module.exports = router;

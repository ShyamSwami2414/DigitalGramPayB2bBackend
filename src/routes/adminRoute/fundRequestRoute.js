const express = require("express");
const {
  fundRequestStats,
  getAllFundRequests,
  approveFundRequest,
  rejectFundRequest,
} = require("../../controllers/adminController/fundRequestController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const router = express.Router();

router.get(
  "/get-fund-requests",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("FUND-REQUEST"),
  getAllFundRequests,
);

router.get(
  "/stats",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("FUND-REQUEST"),
  fundRequestStats,
);

router.patch(
  "/approve-fund-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("FUND-REQUEST"),
  approveFundRequest,
);

router.patch(
  "/reject-fund-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("FUND-REQUEST"),
  rejectFundRequest,
);
module.exports = router;

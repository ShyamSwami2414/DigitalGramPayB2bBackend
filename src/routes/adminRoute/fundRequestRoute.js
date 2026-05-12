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
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/get-fund-requests",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("FUND-REQUEST"),
  asyncHandler(getAllFundRequests),
);

router.get(
  "/stats",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("FUND-REQUEST"),
  asyncHandler(fundRequestStats),
);

router.patch(
  "/approve-fund-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("FUND-REQUEST"),
  asyncHandler(approveFundRequest),
);

router.patch(
  "/reject-fund-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("FUND-REQUEST"),
  asyncHandler(rejectFundRequest),
);
module.exports = router;

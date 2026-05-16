const express = require("express");
const {
  getAllUserRequests,
  updateUserRequestStatus,
} = require("../../controllers/adminController/userRequestController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/get-user-requests",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("USER_REQUEST"),
  asyncHandler(getAllUserRequests),
);

router.patch(
  "/update-request-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("USER_REQUEST"),
  asyncHandler(updateUserRequestStatus),
);

module.exports = router;

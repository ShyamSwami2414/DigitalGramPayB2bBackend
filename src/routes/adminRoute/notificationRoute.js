const express = require("express");
const {
  getAllNotification,
  createNotification,
  deleteNotification,
  toggleNotificationStatus,
} = require("../../controllers/adminController/notificationController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/all-notifications",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  asyncHandler(getAllNotification),
);

router.post(
  "/create-notification",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  asyncHandler(createNotification),
);

router.patch(
  "/toggle-notification/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  asyncHandler(toggleNotificationStatus),
);

router.delete(
  "/delete-notification/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  asyncHandler(deleteNotification),
);

module.exports = router;

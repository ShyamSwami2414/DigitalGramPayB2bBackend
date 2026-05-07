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
const router = express.Router();

router.get(
  "/all-notifications",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  getAllNotification,
);

router.post(
  "/create-notification",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  createNotification,
);

router.patch(
  "/toggle-notification/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  toggleNotificationStatus,
);

router.delete(
  "/delete-notification/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  deleteNotification,
);

module.exports = router;

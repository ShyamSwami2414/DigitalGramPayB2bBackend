const express = require("express");
const {
  getAllNotification,
  createNotification,
  deleteNotification,
  toggleNotificationStatus,
} = require("../../controllers/adminController/notificationController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.get(
  "/all-notifications",
  authenticateUser,
  authorizeRoles("admin"),
  getAllNotification,
);

router.post(
  "/create-notification",
  authenticateUser,
  authorizeRoles("admin"),
  createNotification,
);

router.patch(
  "/toggle-notification/:id",
  authenticateUser,
  authorizeRoles("admin"),
  toggleNotificationStatus,
);

router.delete(
  "/delete-notification/:id",
  authenticateUser,
  authorizeRoles("admin"),
  deleteNotification,
);

module.exports = router;

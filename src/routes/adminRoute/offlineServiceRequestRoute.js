const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const {
  getOfflineServiceRequestById,
  listOfflineServiceRequests,
  updateOfflineServiceRequestStatus,
  deleteOfflineServiceRequest,
} = require("../../controllers/adminController/offlineServiceRequestController");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");

const router = express.Router();

router.get(
  "/list-offline-service-requests",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("OFFLINE_SERVICE"),
  listOfflineServiceRequests,
);

router.get(
  "/offline-service-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("OFFLINE_SERVICE"),
  getOfflineServiceRequestById,
);

router.delete(
  "/delete-offline-service-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("OFFLINE_SERVICE"),
  deleteOfflineServiceRequest,
);

router.put(
  "/update-service-request-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("OFFLINE_SERVICE"),
  updateOfflineServiceRequestStatus,
);

module.exports = router;

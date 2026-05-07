const express = require("express");
const {
  getOfflineServiceById,
  createOfflineService,
  listAllOfflineServices,
  updateOfflineService,
  deleteOfflineService,
} = require("../../controllers/adminController/offlineServiceController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const createUploader = require("../../middleware/uploadMiddleware");
const multerErrorHandler = require("../../middleware/multerErrorHandler");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const router = express.Router();

const upload = createUploader("offlineServices", /jpeg|jpg|png|pdf/, 2048);

router.get(
  "/list-offline-service",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("OFFLINE_SERVICE"),
  listAllOfflineServices,
);

router.post(
  "/create-offline-service",
  authenticateUser,
  authorizeRoles("admin"),
  multerErrorHandler(upload.single("offlineServiceImage")),
  checkAllowedPermission("OFFLINE_SERVICE"),
  createOfflineService,
);

router.get(
  "/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("OFFLINE_SERVICE"),
  getOfflineServiceById,
);

router.put(
  "/update-offline-service/:id",
  authenticateUser,
  authorizeRoles("admin"),
  multerErrorHandler(upload.single("offlineServiceImage")),
  checkAllowedPermission("OFFLINE_SERVICE"),
  updateOfflineService,
);

router.delete(
  "/delete-offline-service/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("OFFLINE_SERVICE"),
  deleteOfflineService,
);

module.exports = router;

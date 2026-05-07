const express = require("express");
const {
  getOnlineServiceById,
  createOnlineService,
  listAllOnlineServices,
  updateOnlineService,
  deleteOnlineService,
} = require("../../controllers/adminController/onlineServiceController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const createUploader = require("../../middleware/uploadMiddleware");
const multerErrorHandler = require("../../middleware/multerErrorHandler");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const router = express.Router();

const upload = createUploader("onlineServices", /jpeg|jpg|png|pdf/, 2048);

router.get(
  "/list-online-service",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ONLINE_SERVICE"),
  listAllOnlineServices,
);

router.post(
  "/create-online-service",
  authenticateUser,
  authorizeRoles("admin"),
  multerErrorHandler(upload.single("onlineServiceImage")),
  checkAllowedPermission("ONLINE_SERVICE"),
  createOnlineService,
);

router.get(
  "/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ONLINE_SERVICE"),
  getOnlineServiceById,
);

router.put(
  "/update-online-service/:id",
  authenticateUser,
  authorizeRoles("admin"),
  multerErrorHandler(upload.single("onlineServiceImage")),
  checkAllowedPermission("ONLINE_SERVICE"),
  updateOnlineService,
);

router.delete(
  "/delete-online-service/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ONLINE_SERVICE"),
  deleteOnlineService,
);

module.exports = router;

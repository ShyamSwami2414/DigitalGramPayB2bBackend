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
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

const upload = createUploader("onlineServices", /jpeg|jpg|png|pdf/, 2048);

router.get(
  "/list-online-service",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ONLINE_SERVICE"),
  asyncHandler(listAllOnlineServices),
);

router.post(
  "/create-online-service",
  authenticateUser,
  authorizeRoles("admin"),
  multerErrorHandler(upload.single("onlineServiceImage")),
  checkAllowedPermission("ONLINE_SERVICE"),
  asyncHandler(createOnlineService),
);

router.get(
  "/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ONLINE_SERVICE"),
  asyncHandler(getOnlineServiceById),
);

router.put(
  "/update-online-service/:id",
  authenticateUser,
  authorizeRoles("admin"),
  multerErrorHandler(upload.single("onlineServiceImage")),
  checkAllowedPermission("ONLINE_SERVICE"),
  asyncHandler(updateOnlineService),
);

router.delete(
  "/delete-online-service/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ONLINE_SERVICE"),
  asyncHandler(deleteOnlineService),
);

module.exports = router;

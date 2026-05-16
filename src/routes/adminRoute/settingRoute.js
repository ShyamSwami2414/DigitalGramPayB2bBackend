const express = require("express");
const router = express.Router();
const {
  getSetting,
  createSetting,
  updateSetting,
} = require("../../controllers/adminController/settingController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const createUploader = require("../../middleware/uploadMiddleware");
const multerErrorHandler = require("../../middleware/multerErrorHandler");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");

const asyncHandler = require("../../utils/asyncHandler");

const settingUpload = createUploader("settings", /jpeg|jpg|png|pdf/, 2048);

router.get(
  "/get-setting",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  asyncHandler(getSetting),
);

router.post(
  "/create-setting",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  multerErrorHandler(
    settingUpload.fields([
      { name: "logo", maxCount: 1 },
      { name: "favicon", maxCount: 1 },
      { name: "qrCode", maxCount: 1 },
    ]),
  ),

  asyncHandler(createSetting),
);

router.put(
  "/update-setting",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  multerErrorHandler(
    settingUpload.fields([
      { name: "logo", maxCount: 1 },
      { name: "favicon", maxCount: 1 },
      { name: "qrCode", maxCount: 1 },
    ]),
  ),
  asyncHandler(updateSetting),
);

module.exports = router;

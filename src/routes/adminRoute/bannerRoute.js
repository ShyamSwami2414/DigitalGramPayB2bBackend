const express = require("express");
const router = express.Router();

const {
  getAllBanners,
  addBanner,
  deleteBanner,
  toggleBannerStatus,
} = require("../../controllers/adminController/bannerController");

const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const createUploader = require("../../middleware/uploadMiddleware");
const multerErrorHandler = require("../../middleware/multerErrorHandler");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");

const upload = createUploader("banner", /jpeg|jpg|png/, 2048);

router.get(
  "/all-banners",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  getAllBanners,
);

router.post(
  "/add-banner",
  authenticateUser,
  authorizeRoles("admin"),
  multerErrorHandler(upload.single("bannerImage")),
  checkAllowedPermission("SETTINGS"),
  addBanner,
);

router.delete(
  "/delete-banner/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  deleteBanner,
);

router.patch(
  "/toggle-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  toggleBannerStatus,
);

module.exports = router;

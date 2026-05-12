const express = require("express");
const {
  createPackage,
  getAllPackages,
  getPackagesByRoleId,
  getActivePackageList,
  updatePackage,
  updatePackageStatus,
  deletePackage,
} = require("../../controllers/adminController/packageController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.post(
  "/create-package",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PACKAGE"),
  asyncHandler(createPackage),
);

router.get(
  "/get-packages",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PACKAGE"),
  asyncHandler(getAllPackages),
);

router.get(
  "/get-packages/:roleId",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PACKAGE"),
  asyncHandler(getPackagesByRoleId),
);

router.get(
  "/get-active-packages",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PACKAGE"),
  asyncHandler(getActivePackageList),
);

router.put(
  "/update-package/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PACKAGE"),
  asyncHandler(updatePackage),
);

router.patch(
  "/update-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PACKAGE"),
  asyncHandler(updatePackageStatus),
);

router.delete(
  "/delete-package/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PACKAGE"),
  asyncHandler(deletePackage),
);

module.exports = router;

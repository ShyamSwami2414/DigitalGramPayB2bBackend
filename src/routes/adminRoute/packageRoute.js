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
const router = express.Router();

router.post(
  "/create-package",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PACKAGE"),
  createPackage,
);

router.get(
  "/get-packages",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PACKAGE"),
  getAllPackages,
);

router.get(
  "/get-packages/:roleId",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PACKAGE"),
  getPackagesByRoleId,
);

router.get(
  "/get-active-packages",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PACKAGE"),
  getActivePackageList,
);

router.put(
  "/update-package/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PACKAGE"),
  updatePackage,
);

router.patch(
  "/update-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PACKAGE"),
  updatePackageStatus,
);

router.delete(
  "/delete-package/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PACKAGE"),
  deletePackage,
);

module.exports = router;

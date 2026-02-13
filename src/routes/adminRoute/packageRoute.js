const express = require("express");
const {
  createPackage,
  getAllPackages,
  updatePackage,
  updatePackageStatus,
  deletePackage,
} = require("../../controllers/adminController/packageController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.post(
  "/create-package",
  authenticateUser,
  authorizeRoles("admin"),
  createPackage,
);

router.get(
  "/get-packages",
  authenticateUser,
  authorizeRoles("admin"),
  getAllPackages,
);

router.put(
  "/update-package/:id",
  authenticateUser,
  authorizeRoles("admin"),
  updatePackage,
);

router.patch(
  "/update-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  updatePackageStatus,
);

router.delete(
  "/delete-package/:id",
  authenticateUser,
  authorizeRoles("admin"),
  deletePackage,
);

module.exports = router;

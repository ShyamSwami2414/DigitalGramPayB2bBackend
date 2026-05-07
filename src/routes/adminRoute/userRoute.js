const express = require("express");
const {
  getUserStats,
  getAllUsers,
  createUser,
  updateUserStatus,
  assignPackageToUser,
  assignServiceToUser,
  getAssignedServices,
  getAllUserList,
  getParticularUserDetail,
} = require("../../controllers/adminController/userController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const router = express.Router();

router.get("/stats", authenticateUser, authorizeRoles("admin"), getUserStats);

//get all users list without pagination
router.get(
  "/get-all-user-list",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("USERS"),
  getAllUserList,
);

// with pagination max 50 users per page
router.get(
  "/get-users",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("USERS"),
  getAllUsers,
);

router.post(
  "/create-user",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("USERS"),
  createUser,
);

router.patch(
  "/update-user-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("USERS"),
  updateUserStatus,
);

router.get(
  "/particular-user/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("USERS"),
  getParticularUserDetail,
);

router.patch(
  "/assign-package/:userId",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PACKAGE"),
  assignPackageToUser,
);

router.patch(
  "/assign-service/:userId",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SERVICE"),
  assignServiceToUser,
);

router.get(
  "/assigned-services/:userId",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SERVICE"),
  getAssignedServices,
);

module.exports = router;

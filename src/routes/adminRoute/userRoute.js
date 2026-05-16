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
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get("/stats", authenticateUser, authorizeRoles("admin"), asyncHandler(getUserStats));

//get all users list without pagination
router.get(
  "/get-all-user-list",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("USERS"),
  asyncHandler(getAllUserList),
);

// with pagination max 50 users per page
router.get(
  "/get-users",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("USERS"),
  asyncHandler(getAllUsers),
);

router.post(
  "/create-user",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("USERS"),
  asyncHandler(createUser),
);

router.patch(
  "/update-user-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("USERS"),
  asyncHandler(updateUserStatus),
);

router.get(
  "/particular-user/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("USERS"),
  asyncHandler(getParticularUserDetail),
);

router.patch(
  "/assign-package/:userId",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PACKAGE"),
  asyncHandler(assignPackageToUser),
);

router.patch(
  "/assign-service/:userId",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SERVICE"),
  asyncHandler(assignServiceToUser),
);

router.get(
  "/assigned-services/:userId",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SERVICE"),
  asyncHandler(getAssignedServices),
);

module.exports = router;

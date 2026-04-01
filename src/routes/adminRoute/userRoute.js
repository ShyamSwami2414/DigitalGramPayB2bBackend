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
const router = express.Router();

router.get("/stats", authenticateUser, authorizeRoles("admin"), getUserStats);

//get all users list without pagination
router.get(
  "/get-all-user-list",
  authenticateUser,
  authorizeRoles("admin"),
  getAllUserList,
);

// with pagination max 50 users per page
router.get(
  "/get-users",
  authenticateUser,
  authorizeRoles("admin"),
  getAllUsers,
);

router.post(
  "/create-user",
  authenticateUser,
  authorizeRoles("admin"),
  createUser,
);

router.patch(
  "/update-user-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  updateUserStatus,
);

router.patch(
  "/assign-package/:userId",
  authenticateUser,
  authorizeRoles("admin"),
  assignPackageToUser,
);

router.patch(
  "/assign-service/:userId",
  authenticateUser,
  authorizeRoles("admin"),
  assignServiceToUser,
);

router.get(
  "/assigned-services/:userId",
  authenticateUser,
  authorizeRoles("admin"),
  getAssignedServices,
);

router.get(
  "/particular-user/:id",
  authenticateUser,
  authorizeRoles("admin"),
  getParticularUserDetail,
);

module.exports = router;

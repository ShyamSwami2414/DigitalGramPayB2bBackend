const express = require("express");
const {
  getUserStats,
  getAllUsers,
  createUser,
  updateUserStatus,
  assignPackageToUser,
  assignServiceToUser,
  getAssignedServices
} = require("../../controllers/adminController/userController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.get("/stats", authenticateUser, authorizeRoles("admin"), getUserStats);

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
  updateUserStatus
);

router.patch(
  "/assign-package/:userId",
  authenticateUser,
  authorizeRoles("admin"),
  assignPackageToUser
);

router.patch(
  "/assign-service/:userId",
  authenticateUser,
  authorizeRoles("admin"),
  assignServiceToUser
);

router.get(
  "/assigned-services/:userId",
  authenticateUser,
  authorizeRoles("admin"),
  getAssignedServices
);

module.exports = router;

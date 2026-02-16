const express = require("express");
const {
  getUserStats,
  getAllUsers,
  createUser,
  updateUserStatus,
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

router.patch("/update-user-status/:id", updateUserStatus);

module.exports = router;

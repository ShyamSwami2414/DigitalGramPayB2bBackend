const express = require("express");
const {
  getAllUsers,
  createUser,
} = require("../../controllers/adminController/userController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

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

module.exports = router;

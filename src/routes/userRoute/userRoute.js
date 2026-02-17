const express = require("express");
const {
  createUser,
  getAllUsers,
  updateUserStatus,
} = require("../../controllers/userController/userController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const router = express.Router();

router.post("/create-user", authenticateUser, createUser);
router.get("/get-users", authenticateUser, getAllUsers);
router.patch("/update-user-status/:id", authenticateUser, updateUserStatus);

module.exports = router;

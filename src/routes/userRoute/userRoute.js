const express = require("express");
const {
  createUser,
  getAllUsers,
} = require("../../controllers/userController/userController");
const router = express.Router();

router.post("/create-user", createUser);
router.get("/get-users", getAllUsers);

module.exports = router;

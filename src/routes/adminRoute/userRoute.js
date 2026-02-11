const express = require("express");
const { getAllUsers } = require("../../controllers/adminController/userController");
const router = express.Router();

router.post("/users", getAllUsers);

module.exports = router;
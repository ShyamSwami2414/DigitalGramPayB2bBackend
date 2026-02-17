const express = require("express");
const { getUserRoles } = require("../../controllers/userController/roleController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const router = express.Router();

router.get("/get-roles", authenticateUser, getUserRoles)

module.exports = router;
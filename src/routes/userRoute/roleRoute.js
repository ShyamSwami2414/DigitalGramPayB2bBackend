const express = require("express");
const { getUserRoles } = require("../../controllers/userController/roleController");
const router = express.Router();

router.get("/get-roles", getUserRoles)

module.exports = router;
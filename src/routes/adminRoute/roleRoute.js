const express = require("express");
const { createRole } = require("../../controllers/adminController/roleController");
const router = express.Router();

router.post("/create-role", createRole);

module.exports = router;
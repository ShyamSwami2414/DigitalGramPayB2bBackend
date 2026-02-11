const express = require("express");
const { userLogin } = require("../../controllers/userController/userAuthController");
const router = express.Router();

router.post("/login", userLogin);

module.exports = router;
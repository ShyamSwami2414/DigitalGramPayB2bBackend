const express = require("express");
const { userRegister, userLogin, verifyUserOtp } = require("../../controllers/userController/userAuthController");
const router = express.Router();

router.post("/user-register", userRegister);
router.post("/user-login", userLogin);
router.post("/verify-user-otp", verifyUserOtp);

module.exports = router;
const express = require("express");
const { superAdminLogin, adminRegister, verifySuperAdminOtp } = require("../../controllers/adminController/adminAuthController");
const router = express.Router();

router.post("/super-login", superAdminLogin);
router.post("/verify-otp", verifySuperAdminOtp);
router.post("/admin-register", adminRegister);

module.exports = router;
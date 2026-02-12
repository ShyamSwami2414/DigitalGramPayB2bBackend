const express = require("express");
const { superAdminLogin, adminRegister } = require("../../controllers/adminController/adminAuthController");
const router = express.Router();

router.post("/super-login", superAdminLogin);
router.post("/admin-register", adminRegister);

module.exports = router;
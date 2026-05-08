const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  superAdminLogin,
  adminRegister,
  verifySuperAdminOtp,
  changePassword,
  fetchProfile,
  updateProfile,
} = require("../../controllers/adminController/adminAuthController");
const router = express.Router();

router.post("/super-login", superAdminLogin);
router.post("/verify-otp", verifySuperAdminOtp);
// router.post("/admin-register", adminRegister);
router.patch("/change-password", authenticateUser, changePassword);
router.patch("/update-profile", authenticateUser, updateProfile);
router.get("/fetch-profile", authenticateUser, fetchProfile);

module.exports = router;

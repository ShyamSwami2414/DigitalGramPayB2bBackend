const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  superAdminLogin,
  adminRegister,
  verifySuperAdminOtp,
  changePassword,
  fetchProfile,
  updateProfile,
  verifyResetPasswordOtp,
  forgotPassword,
  resetPassword,
} = require("../../controllers/adminController/adminAuthController");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.post("/super-login", asyncHandler(superAdminLogin));
router.post("/verify-otp", asyncHandler(verifySuperAdminOtp));
// router.post("/admin-register", adminRegister);
router.patch(
  "/change-password",
  authenticateUser,
  asyncHandler(changePassword),
);
router.patch("/update-profile", authenticateUser, asyncHandler(updateProfile));
router.get("/fetch-profile", authenticateUser, asyncHandler(fetchProfile));

//for forgot-password otp
router.post("/verify-pass-otp", asyncHandler(verifyResetPasswordOtp));

router.post("/forgot-pass", asyncHandler(forgotPassword));

//for forgot-password flow
router.post("/reset-pass", asyncHandler(resetPassword));

module.exports = router;

const express = require("express");
const {
  userRegister,
  userLogin,
  verifyUserOtp,
  changePassword,
  fetchProfile,
  forgotPassword,
  verifyResetPasswordOtp,
  resetPassword,
} = require("../../controllers/userController/userAuthController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const router = express.Router();
const asyncHandler = require("../../utils/asyncHandler");

router.post("/user-register", asyncHandler(userRegister));

router.post("/user-login", asyncHandler(userLogin));

//for login otp
router.post("/verify-user-otp", asyncHandler(verifyUserOtp));

//for forgot-password otp
router.post("/verify-password-otp", asyncHandler(verifyResetPasswordOtp));

router.post("/forgot-password", asyncHandler(forgotPassword));

//for forgot-password flow
router.post("/reset-password", asyncHandler(resetPassword));

////from user dashboard
router.patch(
  "/change-user-password",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(changePassword),
);
router.get(
  "/fetch-user-profile",
  authenticateUser,
  // checkUserPaymentAndKYC,
  asyncHandler(fetchProfile),
);

module.exports = router;

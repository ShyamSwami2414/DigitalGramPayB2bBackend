const express = require("express");
const {
  userRegister,
  userLogin,
  verifyUserOtp,
  changePassword,
  fetchProfile,
  forgotPassword,
} = require("../../controllers/userController/userAuthController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const router = express.Router();
const asyncHandler = require("../../utils/asyncHandler");

router.post("/user-register", asyncHandler(userRegister));

router.post("/user-login", asyncHandler(userLogin));

router.post("/verify-user-otp", asyncHandler(verifyUserOtp));

router.patch("/forgot-password", asyncHandler(forgotPassword));

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

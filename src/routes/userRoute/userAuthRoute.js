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
<<<<<<< HEAD

router.post("/user-register", userRegister);

router.post("/user-login", userLogin);

router.post("/verify-user-otp", verifyUserOtp);
=======
const asyncHandler = require("../../utils/asyncHandler");

router.post("/user-register", userRegister);

router.post("/user-login", asyncHandler(userLogin));

router.post("/verify-user-otp", asyncHandler(verifyUserOtp));
>>>>>>> core/main

router.patch("/forgot-password", forgotPassword);

router.patch(
  "/change-user-password",
  authenticateUser,
  checkUserPaymentAndKYC,
  changePassword,
);
router.get(
  "/fetch-user-profile",
  authenticateUser,
  // checkUserPaymentAndKYC,
  fetchProfile,
);

module.exports = router;

const express = require("express");
const {
  userRegister,
  userLogin,
  verifyUserOtp,
  changePassword,
  fetchProfile,
} = require("../../controllers/userController/userAuthController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const router = express.Router();

router.post("/user-register", userRegister);

router.post("/user-login", userLogin);

router.post("/verify-user-otp", verifyUserOtp);

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

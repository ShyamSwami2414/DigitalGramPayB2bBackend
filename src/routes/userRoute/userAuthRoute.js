const express = require("express");
const {
  userRegister,
  userLogin,
  verifyUserOtp,
  changePassword,
  fetchProfile
} = require("../../controllers/userController/userAuthController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const router = express.Router();

router.post("/user-register", userRegister);
router.post("/user-login", userLogin);
router.post("/verify-user-otp", verifyUserOtp);
router.patch("/change-user-password", authenticateUser, changePassword);
router.get("/fetch-user-profile", authenticateUser, fetchProfile);


module.exports = router;

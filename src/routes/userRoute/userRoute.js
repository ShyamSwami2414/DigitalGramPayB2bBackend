const express = require("express");
const {
  createUser,
  getAllUsers,
  updateUserStatus,
  getMyDownlineUsers,
} = require("../../controllers/userController/userController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const router = express.Router();

router.post(
  "/create-user",
  authenticateUser,
  checkUserPaymentAndKYC,
  createUser,
);

//get all user under me only
router.get("/get-users", authenticateUser, checkUserPaymentAndKYC, getAllUsers);

//this api return all user whether direct or indirect child all
router.get(
  "/get-downline-users",
  authenticateUser,
  checkUserPaymentAndKYC,
  getMyDownlineUsers,
);

router.patch(
  "/update-user-status/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  updateUserStatus,
);

module.exports = router;

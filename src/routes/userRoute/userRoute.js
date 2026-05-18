const express = require("express");
const {
  createUser,
  getAllUsers,
  updateUserStatus,
  getMyDownlineUsers,
} = require("../../controllers/userController/userController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.post(
  "/create-user",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(createUser),
);

//get all user under me only
router.get("/get-users", authenticateUser, checkUserPaymentAndKYC, asyncHandler(getAllUsers));

//this api return all user whether direct or indirect child all
router.get(
  "/get-downline-users",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getMyDownlineUsers),
);

router.patch(
  "/update-user-status/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(updateUserStatus),
);

module.exports = router;

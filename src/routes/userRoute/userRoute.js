const express = require("express");
const {
  createUser,
  getAllUsers,
  updateUserStatus,
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
router.get("/get-users", authenticateUser, checkUserPaymentAndKYC, getAllUsers);
router.patch(
  "/update-user-status/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  updateUserStatus,
);

module.exports = router;

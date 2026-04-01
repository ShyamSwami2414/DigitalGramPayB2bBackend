const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getAllTopupBanks,
} = require("../../controllers/userController/topupBankController");

const router = express.Router();

router.get(
  "/get-all-topup-banks",
  authenticateUser,
  // checkUserPaymentAndKYC,
  getAllTopupBanks,
);

module.exports = router;

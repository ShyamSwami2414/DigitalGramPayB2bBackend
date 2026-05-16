const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getAllTopupBanks,
} = require("../../controllers/userController/topupBankController");

const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

router.get(
  "/get-all-topup-banks",
  authenticateUser,
  // checkUserPaymentAndKYC,
  asyncHandler(getAllTopupBanks),
);

module.exports = router;

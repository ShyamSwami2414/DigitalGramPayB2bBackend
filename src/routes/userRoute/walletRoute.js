const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getWalletBalance,
  aepsToMainTransfer,
} = require("../../controllers/userController/walletController");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");
const apiLogger = require("../../middleware/apiLogger");
const router = express.Router();

router.get(
  "/get-wallet-balance",
  authenticateUser,
  checkUserPaymentAndKYC,
  getWalletBalance,
);

//for balance transfer

router.patch(
  "/aeps-to-main",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  aepsToMainTransfer,
);

module.exports = router;

const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const {
  getWalletBalance,
  aepsToMainTransfer,
  getWalletTransferHistory,
  getWalletReport,
} = require("../../controllers/userController/walletController");
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
  aepsToMainTransfer,
);

// this api only for wallet aeps to main wallet transfer history
router.get(
  "/wallet-transfer-history",
  authenticateUser,
  checkUserPaymentAndKYC,
  getWalletTransferHistory,
);

// this api for all wallet transaction that impact on main wallet and aeps wallet
router.get(
  "/wallet-report",
  authenticateUser,
  checkUserPaymentAndKYC,
  getWalletReport,
);

module.exports = router;

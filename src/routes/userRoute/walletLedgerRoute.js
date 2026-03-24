const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getWalletStats,
  getWalletTransferHistory,
  getWalletReport,
} = require("../../controllers/userController/walletLedgerController");

const router = express.Router();

//stats combined from both ledger  and reports
router.get(
  "/wallet-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  getWalletStats,
);

// this api only for wallet aeps to main wallet transfer history
router.get(
  "/wallet-history",
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

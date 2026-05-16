const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getWalletStats,
  getWalletTransferHistory,
  getWalletReport,
} = require("../../controllers/userController/walletLedgerController");

const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

//stats combined from both ledger  and reports
router.get(
  "/wallet-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getWalletStats),
);

// this api only for wallet aeps to main wallet transfer history
router.get(
  "/wallet-history",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getWalletTransferHistory),
);

// this api for all wallet transaction that impact on main wallet and aeps wallet
router.get(
  "/wallet-report",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getWalletReport),
);

module.exports = router;

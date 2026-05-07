const mongoose = require("mongoose");
const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const {
  getAllUserWallet,
  holdReleaseAmount,
  creditDebitAmount,
  getWalletBalances,
  aepsToEwalletHistory,
} = require("../../controllers/adminController/userWalletController");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const router = express.Router();

router.get(
  "/get-wallet-balances",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("WALLET"),
  getWalletBalances,
);

router.get(
  "/get-all-user-wallet",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("WALLET"),
  getAllUserWallet,
);

router.patch(
  "/hold-release-amount",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("WALLET"),
  holdReleaseAmount,
);

router.patch(
  "/credit-debit-amount",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("WALLET"),
  creditDebitAmount,
);

module.exports = router;

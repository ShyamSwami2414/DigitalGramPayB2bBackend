const mongoose = require("mongoose");
const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { getAllUserWallet, holdReleaseAmount, creditDebitAmount, getWalletBalances } = require("../../controllers/adminController/userWalletController");
const router = express.Router();

router.get(
    "/get-wallet-balances",
    authenticateUser,
    authorizeRoles("admin"),
    getWalletBalances
)

router.get(
    "/get-all-user-wallet",
    authenticateUser,
    authorizeRoles("admin"),
    getAllUserWallet
);

router.patch("/hold-release-amount",
    authenticateUser,
    authorizeRoles("admin"),
    holdReleaseAmount
)

router.patch("/credit-debit-amount",
    authenticateUser,
    authorizeRoles("admin"),
    creditDebitAmount
);

module.exports = router;

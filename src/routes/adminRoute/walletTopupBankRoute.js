const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { addWalletTopupBank, getAllWalletTopupBanks } = require("../../controllers/adminController/walletTopupBankController");
const router = express.Router();

router.get(
    "/get-all-bank",
    authenticateUser,
    authorizeRoles("admin"),
    getAllWalletTopupBanks
);

router.post(
    "/add-wallet-topup-bank",
    authenticateUser,
    authorizeRoles("admin"),
    addWalletTopupBank
);

module.exports = router;
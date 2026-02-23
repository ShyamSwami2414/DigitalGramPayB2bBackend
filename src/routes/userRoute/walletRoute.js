const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { getWalletBalance, aepsToMainTransfer, getWalletTransferHistory } = require("../../controllers/userController/walletController");
const router = express.Router();

router.get(
    "/get-wallet-balance/:userId",
    authenticateUser,
    getWalletBalance
);

//for balance transfer

router.patch("/aeps-to-main",
    authenticateUser,
    aepsToMainTransfer
);

router.get(
    "/wallet-transfer-history",
    authenticateUser,
    getWalletTransferHistory
);

module.exports = router;
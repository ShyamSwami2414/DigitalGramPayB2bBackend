const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { getWalletBalance, aepsToMainTransfer, getWalletTransferHistory, getWalletReport } = require("../../controllers/userController/walletController");
const router = express.Router();

router.get(
    "/get-wallet-balance",
    authenticateUser,
    getWalletBalance
);

//for balance transfer

router.patch("/aeps-to-main",
    authenticateUser,
    aepsToMainTransfer
);

// this api only for wallet aeps to main wallet transfer history
router.get(
    "/wallet-transfer-history",
    authenticateUser,
    getWalletTransferHistory
);

// this api for all wallet transaction that impact on main wallet and aeps wallet
router.get(
    "/wallet-report",
    authenticateUser,
    getWalletReport
);

module.exports = router;
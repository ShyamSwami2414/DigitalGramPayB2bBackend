const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const { addWalletTopupBank,
    getAllWalletTopupBanks,
    deleteWalletTopupBank,
    updateWalletTopupBankStatus
} = require("../../controllers/adminController/walletTopupBankController");

const createUploader = require("../../middleware/uploadMiddleware");
const multerErrorHandler = require("../../middleware/multerErrorHandler");
const router = express.Router();

const upload = createUploader("qrCodeImages", /jpeg|jpg|png/, 2048);

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
    multerErrorHandler(upload.single("qrCode")),
    addWalletTopupBank
);

router.patch(
    "/update-wallet-topup-bank-status/:id",
    authenticateUser,
    authorizeRoles("admin"),
    updateWalletTopupBankStatus
);

router.delete(
    "/delete-wallet-topup-bank/:id",
    authenticateUser,
    authorizeRoles("admin"),
    deleteWalletTopupBank
);

module.exports = router;
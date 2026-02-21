const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { getWalletBalance } = require("../../controllers/userController/walletController");
const router = express.Router();

router.get(
    "/get-wallet-balance/:userId",
    authenticateUser,
    getWalletBalance
);

module.exports = router;
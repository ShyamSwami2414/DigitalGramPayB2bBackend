const mongoose = require("mongoose");
const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { getAllUserWallet, holdReleaseAmount } = require("../../controllers/adminController/userWalletController");
const router = express.Router();

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

module.exports = router;

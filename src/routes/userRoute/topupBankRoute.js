const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { getAllTopupBanks } = require("../../controllers/userController/topupBankController");

const router = express.Router();

router.get(
    "/get-all-topup-banks",
    authenticateUser,
    getAllTopupBanks
);

module.exports = router;
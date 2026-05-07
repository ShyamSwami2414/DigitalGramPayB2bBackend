const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  getBankList,
} = require("../../controllers/userController/sozoAepsPayoutBankController");

const router = express.Router();

router.get("/bank-list", authenticateUser, getBankList);

module.exports = router;

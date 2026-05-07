const express = require("express");
const {
  getGlobalBankList,
} = require("../../controllers/userController/globalBankController");
const { authenticateUser } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/global-banks-list", authenticateUser, getGlobalBankList);

module.exports = router;

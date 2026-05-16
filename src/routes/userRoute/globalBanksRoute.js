const express = require("express");
const {
  getGlobalBankList,
} = require("../../controllers/userController/globalBankController");
const { authenticateUser } = require("../../middleware/authMiddleware");

const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

router.get("/global-banks-list", authenticateUser, asyncHandler(getGlobalBankList));

module.exports = router;

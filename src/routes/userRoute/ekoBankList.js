const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  getBankList,
} = require("../../controllers/userController/ekoBankController");

const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

router.get("/bank-list", authenticateUser, asyncHandler(getBankList));

module.exports = router;

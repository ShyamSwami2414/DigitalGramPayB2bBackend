const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  getBankList,
} = require("../../controllers/userController/ekoBankController");

const router = express.Router();

router.get("/bank-list", authenticateUser, getBankList);

module.exports = router;

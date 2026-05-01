const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  myAllTransaction,
} = require("../../controllers/userController/sozoXpressPayoutReportController");

const router = express.Router();

router.get("/list-all", authenticateUser, myAllTransaction);

module.exports = router;

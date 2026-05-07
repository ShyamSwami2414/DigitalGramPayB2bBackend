const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {getDmtStats} = require("../../controllers/userController/dmtReportController");

const router = express.Router();

router.get("/dmt-stats", authenticateUser, getDmtStats);

module.exports = router;

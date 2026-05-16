const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getDmtStats,
} = require("../../controllers/userController/dmtReportController");
const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

router.get("/dmt-stats", authenticateUser, asyncHandler(getDmtStats));

module.exports = router;

const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getBbpsStats,
} = require("../../controllers/userController/billPaymentReportController");

const router = express.Router();

router.get(
  "/bbps-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  getBbpsStats,
);

module.exports = router;

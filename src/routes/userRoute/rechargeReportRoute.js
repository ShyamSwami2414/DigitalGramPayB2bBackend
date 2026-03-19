const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getMyLastRechargeHistory,
} = require("../../controllers/userController/rechargeReportController");

const router = express.Router();

router.get(
  "/my-recharge-history",
  authenticateUser,
  checkUserPaymentAndKYC,
  getMyLastRechargeHistory,
);

module.exports = router;

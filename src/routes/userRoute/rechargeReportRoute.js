const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getMyLastRechargeHistory,
  getRechargeStats,
  getCompleteRechargeReport,
  getRechargeReportById,
} = require("../../controllers/userController/rechargeReportController");

const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

//get my last 5 recharge transaction
router.get(
  "/my-recharge-history",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getMyLastRechargeHistory),
);

router.get(
  "/recharge-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getRechargeStats),
);

//get all recharge transaction of me and my downline
router.get(
  "/complete-recharge-report",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getCompleteRechargeReport),
);

router.get(
  "/report/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getRechargeReportById),
);

module.exports = router;

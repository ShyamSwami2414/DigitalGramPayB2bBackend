const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getMyLastBillPaymentHistory,
  getBillPaymentStats,
  getCompleteBillPaymentReport,
  getBbpsReportById,
} = require("../../controllers/userController/billPaymentReportController");
const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

//get my last 5 recharge transaction
router.get(
  "/my-bbps-history",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getMyLastBillPaymentHistory),
);

router.get(
  "/bbps-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getBillPaymentStats),
);

//get all recharge transaction of me and my downline
router.get(
  "/complete-bbps-report",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getCompleteBillPaymentReport),
);

router.get(
  "/report/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getBbpsReportById),
);

module.exports = router;

const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getMyLastAepsHistory,
  getAepsStats,
  getCompleteAepsReport,
  getAepsReportById,
} = require("../../controllers/userController/nobleAepsReportController");
const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

//get my last 5 aeps transaction
router.get(
  "/my-aeps-history",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getMyLastAepsHistory),
);

router.get(
  "/aeps-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getAepsStats),
);

//get all aeps transaction of me and my downline
router.get(
  "/complete-aeps-report",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getCompleteAepsReport),
);

router.get(
  "/report/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getAepsReportById),
);

module.exports = router;

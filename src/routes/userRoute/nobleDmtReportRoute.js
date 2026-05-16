const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getMyLastDmtHistory,
  getDmtStats,
  getCompleteDmtReport,
  getDmtReportById,
} = require("../../controllers/userController/nobleDmtReportController");

const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

//get my last 5 aeps transaction
router.get(
  "/my-dmt-history",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getMyLastDmtHistory),
);

router.get(
  "/dmt-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getDmtStats),
);

//get all aeps transaction of me and my downline
router.get(
  "/complete-dmt-report",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getCompleteDmtReport),
);

router.get(
  "/report/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getDmtReportById),
);

module.exports = router;

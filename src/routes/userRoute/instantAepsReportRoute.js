const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getMyLastAepsHistory,
  getAepsStats,
  getCompleteAepsReport,
  getAepsReportById,
} = require("../../controllers/userController/instantAepsReportController");

const router = express.Router();

//get my last 5 aeps transaction
router.get(
  "/my-aeps-history",
  authenticateUser,
  checkUserPaymentAndKYC,
  getMyLastAepsHistory,
);

router.get(
  "/aeps-stats",
  authenticateUser,
  checkUserPaymentAndKYC,
  getAepsStats,
);

//get all aeps transaction of me and my downline
router.get(
  "/complete-aeps-report",
  authenticateUser,
  checkUserPaymentAndKYC,
  getCompleteAepsReport,
);

router.get(
  "/report/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  getAepsReportById,
);

module.exports = router;

const express = require("express");
const {
  getAepsStateList,
  getAepsBankList,
  onboardNewAgent,
  checkAgentLoadStatus,
  completetBiometricKyc,
  checkAgentOnboardStatus,
  dailyLogin,
  doTransaction,
} = require("../../controllers/userController/nobleAepsController");
const { authenticateUser } = require("../../middleware/authMiddleware");

const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const apiLogger = require("../../middleware/apiLogger");
const asyncHandler = require("../../utils/asyncHandler");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");
const router = express.Router();

router.get(
  "/state-list",
  authenticateUser,
  apiLogger,
  asyncHandler(getAepsStateList),
);

router.get(
  "/bank-list",
  authenticateUser,
  apiLogger,
  asyncHandler(getAepsBankList),
);

router.post(
  "/onboard",
  authenticateUser,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(onboardNewAgent),
);

//onboard-statuss
router.get(
  "/check-onboard-status",
  authenticateUser,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(checkAgentOnboardStatus),
);

//load agent
router.get(
  "/check-status",
  authenticateUser,
  apiLogger,
  asyncHandler(checkAgentLoadStatus),
);

router.post(
  "/biometric-kyc",
  authenticateUser,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(completetBiometricKyc),
);

router.post(
  "/daily-login",
  authenticateUser,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(dailyLogin),
);

router.post(
  "/transaction",
  authenticateUser,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(doTransaction),
);

module.exports = router;

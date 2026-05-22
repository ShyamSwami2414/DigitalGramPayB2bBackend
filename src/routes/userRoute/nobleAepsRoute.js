const express = require("express");
const {
  getAepsStateList,
  onboardNewAgent,
  checkAgentStatus,
  completetBiometricKyc,
  checkAgentOnboardStatus,
  dailyLogin,
  doTransaction
} = require("../../controllers/userController/nobleAepsController");
const { authenticateUser } = require("../../middleware/authMiddleware");

const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const apiLogger = require("../../middleware/apiLogger");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/state-list",
  authenticateUser,
  apiLogger,
  asyncHandler(getAepsStateList),
);

router.post(
  "/onboard",
  authenticateUser,
  apiLogger,
  asyncHandler(onboardNewAgent),
);

//load
router.get(
  "/check-status",
  authenticateUser,
  apiLogger,
  asyncHandler(checkAgentStatus),
);

router.post(
  "/biometric-kyc",
  authenticateUser,
  apiLogger,
  asyncHandler(completetBiometricKyc),
);

router.post(
  "/daily-login",
  authenticateUser,
  apiLogger,
  asyncHandler(dailyLogin),
);

router.post(
  "/do-transaction",
  authenticateUser,
  apiLogger,
  asyncHandler(doTransaction),
);

//onboard-statuss
router.get(
  "/check-onboard-status",
  authenticateUser,
  apiLogger,
  asyncHandler(checkAgentOnboardStatus),
);

module.exports = router;

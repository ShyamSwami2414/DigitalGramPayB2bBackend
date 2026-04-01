const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getAllOperatorCodeList,
  getAllCircleCodeList,
  mobileVerify,
  fetchPlan,
  doMobilePrepaidRecharge,
} = require("../../controllers/userController/rechargeController");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");
const apiLogger = require("../../middleware/apiLogger");
const router = express.Router();

router.get(
  "/operator-list",
  authenticateUser,
  checkUserPaymentAndKYC,
  getAllOperatorCodeList,
);
router.get(
  "/circle-list",
  authenticateUser,
  checkUserPaymentAndKYC,
  getAllCircleCodeList,
);

router.get(
  "/mobile-verify/:mobile",
  authenticateUser,
  checkUserPaymentAndKYC,
  mobileVerify,
);
router.get("/fetch-plan", authenticateUser, checkUserPaymentAndKYC, fetchPlan);

router.post(
  "/mobile-prepaid-recharge",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  doMobilePrepaidRecharge,
);

module.exports = router;

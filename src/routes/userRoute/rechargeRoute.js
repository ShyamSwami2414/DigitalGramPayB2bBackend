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
const validatePipeline = require("../../middleware/pipelineCheckMiddleware");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");
const apiLogger = require("../../middleware/apiLogger");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/operator-list",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getAllOperatorCodeList),
);
router.get(
  "/circle-list",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getAllCircleCodeList),
);

router.use(validatePipeline("recharge1"));
router.get(
  "/mobile-verify/:mobile",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(mobileVerify),
);
router.get("/fetch-plan", authenticateUser, checkUserPaymentAndKYC, asyncHandler(fetchPlan));

router.post(
  "/mobile-prepaid-recharge",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(doMobilePrepaidRecharge),
);

module.exports = router;

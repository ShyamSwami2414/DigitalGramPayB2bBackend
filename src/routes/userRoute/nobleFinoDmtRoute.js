const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getCustomer,
  checkLimit,
  doCustomerKyc,
  generateRegistrationOtp,
  registerNewCustomer,
  generateTransactionOtp,
  initiateTransaction,
} = require("../../controllers/userController/nobleFinoDmtController");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");
const validatePipeline = require("../../middleware/pipelineCheckMiddleware");
const apiLogger = require("../../middleware/apiLogger");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();
router.use(validatePipeline("dmt1"));

// get all list whether approved or not
router.post(
  "/get-customer",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(getCustomer),
);

router.post(
  "/check-limit",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(checkLimit),
);

router.post(
  "/customer-ekyc",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(doCustomerKyc),
);

router.post(
  "/generate-reg-otp",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(generateRegistrationOtp),
);

router.post(
  "/register-customer",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(registerNewCustomer),
);

router.post(
  "/generate-totp",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(generateTransactionOtp),
);

router.post(
  "/transfer-fund",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(initiateTransaction),
);

module.exports = router;

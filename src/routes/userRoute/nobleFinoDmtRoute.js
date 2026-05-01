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
const apiLogger = require("../../middleware/apiLogger");
const router = express.Router();

// get all list whether approved or not
router.post(
  "/get-customer",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  getCustomer,
);

router.post(
  "/check-limit",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  checkLimit,
);

router.post(
  "/customer-ekyc",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  doCustomerKyc,
);

router.post(
  "/generate-reg-otp",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  generateRegistrationOtp,
);

router.post(
  "/register-customer",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  registerNewCustomer,
);

router.post(
  "/generate-totp",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  generateTransactionOtp,
);

router.post(
  "/transfer-fund",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  initiateTransaction,
);

module.exports = router;

const express = require("express");
const {
  userProfileForRefill,
  refillUserWallet,
  getDownlineWalletRefillHistory,
} = require("../../controllers/userController/userWalletRefillController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");
const apiLogger = require("../../middleware/apiLogger");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const router = express.Router();

//user profile detail like wallet name email etc
router.get(
  "/user-profile",
  authenticateUser,
  checkUserPaymentAndKYC,
  userProfileForRefill,
);

router.post(
  "/refill-user-wallet",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  refillUserWallet,
);

//this api for get history of downline wallet refill
router.get(
  "/wallet-refill-history",
  authenticateUser,
  checkUserPaymentAndKYC,
  getDownlineWalletRefillHistory,
);

module.exports = router;

const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  globalTransactionSearch,
} = require("../../controllers/userController/transactionSearchController");

const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

router.get(
  "/transaction-search",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(globalTransactionSearch),
);

module.exports = router;

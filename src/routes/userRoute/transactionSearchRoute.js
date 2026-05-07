const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  globalTransactionSearch,
} = require("../../controllers/userController/transactionSearchController");

const router = express.Router();

router.get(
  "/transaction-search",
  authenticateUser,
  checkUserPaymentAndKYC,
  globalTransactionSearch,
);

module.exports = router;

const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  globalTransactionSearch,
} = require("../../controllers/adminController/transactionSearchController");

const asyncHandler = require("../../utils/asyncHandler");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/transaction-search",
  authenticateUser,
  authorizeRoles("admin"),
  asyncHandler(globalTransactionSearch),
);

module.exports = router;

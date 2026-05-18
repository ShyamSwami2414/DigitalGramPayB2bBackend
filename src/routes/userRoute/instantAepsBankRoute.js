const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getBanksList,
} = require("../../controllers/userController/instantAepsBankController");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

// get all list whether approved or not
router.get(
  "/list-banks",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getBanksList),
);

module.exports = router;

const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getXpressPayoutBanks,
  addXpressPayoutBank,

  deleteXpressPayoutBank,
} = require("../../controllers/userController/sozoXpressPayoutBankController");

const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

router.get(
  "/bank-list",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getXpressPayoutBanks),
);

router.post(
  "/add-payout-bank",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(addXpressPayoutBank),
);

router.delete(
  "/delete-payout-bank/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(deleteXpressPayoutBank),
);

module.exports = router;

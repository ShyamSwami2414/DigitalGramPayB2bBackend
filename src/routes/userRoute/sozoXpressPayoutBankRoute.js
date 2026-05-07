const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getXpressPayoutBanks,
  addXpressPayoutBank,

  deleteXpressPayoutBank,
} = require("../../controllers/userController/sozoXpressPayoutBankController");

const router = express.Router();

router.get(
  "/bank-list",
  authenticateUser,
  checkUserPaymentAndKYC,
  getXpressPayoutBanks,
);

router.post(
  "/add-payout-bank",
  authenticateUser,
  checkUserPaymentAndKYC,
  addXpressPayoutBank,
);

router.delete(
  "/delete-payout-bank/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  deleteXpressPayoutBank,
);

module.exports = router;

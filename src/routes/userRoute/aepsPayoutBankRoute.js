const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  addAepsPayoutBank,
  getAepsPayoutBanks,
  getApprovedAepsBankList,
  deleteAepsPayoutBank,
} = require("../../controllers/userController/aepsPayoutBankController");
const router = express.Router();

// get all list whether approved or not
router.get(
  "/aeps-payout-banks",
  authenticateUser,
  checkUserPaymentAndKYC,
  getAepsPayoutBanks,
);

// get only approved list for select bar
router.get(
  "/approved-aeps-banks",
  authenticateUser,
  checkUserPaymentAndKYC,
  getApprovedAepsBankList,
);

router.post(
  "/add-aeps-payout-bank",
  authenticateUser,
  checkUserPaymentAndKYC,
  addAepsPayoutBank,
);

router.delete(
  "/delete-aeps-payout-bank/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  deleteAepsPayoutBank,
);

module.exports = router;

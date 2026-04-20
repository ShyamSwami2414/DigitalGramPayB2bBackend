const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  addAepsPayoutBank,
  getAepsPayoutBanks,
  getApprovedAepsBankList,
  deleteAepsPayoutBank,
} = require("../../controllers/userController/sozoAepsPayoutBankRequestController");
const multerErrorHandler = require("../../middleware/multerErrorHandler");
const createUploader = require("../../middleware/uploadMiddleware");
const router = express.Router();

const upload = createUploader("aepsPayoutCheque", /jpeg|jpg|png/, 2048);

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
  multerErrorHandler(upload.single("cheque")),
  addAepsPayoutBank,
);

router.delete(
  "/delete-aeps-payout-bank/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  deleteAepsPayoutBank,
);


module.exports = router;

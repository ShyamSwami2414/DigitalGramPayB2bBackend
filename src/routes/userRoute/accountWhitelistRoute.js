const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  getAccountWhitelist,
  addAccountWhitelist,
} = require("../../controllers/userController/accountWhitelistController");
const createUploader = require("../../middleware/uploadMiddleware");
const multerErrorHandler = require("../../middleware/multerErrorHandler");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const router = express.Router();
const asyncHandler = require("../../utils/asyncHandler");

const upload = createUploader("accountWhitelist", /jpeg|jpg|png|pdf/, 2048);

router.get(
  "/",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getAccountWhitelist),
);

//add-account-whitelist
router.post(
  "/",
  authenticateUser,
  checkUserPaymentAndKYC,
  multerErrorHandler(
    upload.fields([
      { name: "chequeImage", maxCount: 1 },
      { name: "passbookOrBankStatement", maxCount: 1 },
    ]),
  ),
  asyncHandler(addAccountWhitelist),
);

module.exports = router;

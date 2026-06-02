const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");
const apiLogger = require("../../middleware/apiLogger");
const {
  addNobleDmtBeneficiary,
  getNobleDmtBeneficiary,
  deleteNobleDmtBeneficiary,
} = require("../../controllers/userController/nobleDmtBeneficiaryController");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

// get all list whether approved or not
router.post(
  "/add-beneficiary",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(addNobleDmtBeneficiary),
);

router.post(
  "/get-beneficiary",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(getNobleDmtBeneficiary),
);

router.post(
  "/delete-beneficiary",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(deleteNobleDmtBeneficiary),
);

module.exports = router;

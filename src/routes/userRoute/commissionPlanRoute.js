const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getMyCommissionPlan,
} = require("../../controllers/userController/commissionPlanController");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/my-commission-plan",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getMyCommissionPlan),
);

module.exports = router;

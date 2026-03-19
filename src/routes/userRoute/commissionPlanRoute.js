const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getMyCommissionPlan,
} = require("../../controllers/userController/commissionPlanController");
const router = express.Router();

router.get(
  "/my-commission-plan",
  authenticateUser,
  checkUserPaymentAndKYC,
  getMyCommissionPlan,
);

module.exports = router;

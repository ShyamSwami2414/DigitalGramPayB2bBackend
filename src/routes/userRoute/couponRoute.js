const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  redeemCoupon,
} = require("../../controllers/userController/couponController");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.post("/redeem-coupon", authenticateUser, asyncHandler(redeemCoupon));

module.exports = router;

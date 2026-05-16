const express = require("express");
const {
  getAllBanner,
} = require("../../controllers/userController/bannerController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const router = express.Router();
const asyncHandler = require("../../utils/asyncHandler");

router.get(
  "/all-banners",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getAllBanner),
);

module.exports = router;

const express = require("express");
const {
  getAllBanner,
} = require("../../controllers/userController/bannerController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const router = express.Router();

router.get(
  "/all-banners",
  authenticateUser,
  checkUserPaymentAndKYC,
  getAllBanner,
);

module.exports = router;

const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getProductList,
  getProductById,
} = require("../../controllers/userController/ecommerceController");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/product/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getProductById),
);

router.get(
  "/product-list",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getProductList),
);

module.exports = router;

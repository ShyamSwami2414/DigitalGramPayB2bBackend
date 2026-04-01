const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const {
  getProductList,
  getProductById,
} = require("../../controllers/userController/ecommerceController");
const router = express.Router();

router.get(
  "/product/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  getProductById,
);

router.get(
  "/product-list",
  authenticateUser,
  checkUserPaymentAndKYC,
  getProductList,
);

module.exports = router;

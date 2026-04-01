const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  createOrder,
  getMyOrders,
  getMyOrderById,
} = require("../../controllers/userController/orderController");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");

router.post(
  "/create-order",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  createOrder,
);

router.get("/my-orders", authenticateUser, checkUserPaymentAndKYC, getMyOrders);

router.get(
  "/my-order/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  getMyOrderById,
);

module.exports = router;

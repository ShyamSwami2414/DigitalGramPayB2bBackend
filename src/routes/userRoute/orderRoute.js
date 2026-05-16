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
const apiLogger = require("../../middleware/apiLogger");

const asyncHandler = require("../../utils/asyncHandler");

router.post(
  "/create-order",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  asyncHandler(createOrder),
);

router.get("/my-orders", authenticateUser, checkUserPaymentAndKYC, asyncHandler(getMyOrders));

router.get(
  "/my-order/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getMyOrderById),
);

module.exports = router;

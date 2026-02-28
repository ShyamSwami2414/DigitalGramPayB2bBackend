const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middleware/authMiddleware");
const { createOrder, getMyOrders, getMyOrderById } = require("../../controllers/userController/orderController");

router.post(
    "/create-order",
    authenticateUser,
    createOrder
);

router.get(
    "/my-orders",
    authenticateUser,
    getMyOrders
);

router.get(
    "/my-order/:id",
    authenticateUser,
    getMyOrderById
);

module.exports = router;
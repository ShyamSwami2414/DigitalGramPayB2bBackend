const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middleware/authMiddleware");
const { createOrder, getMyOrders } = require("../../controllers/userController/orderController");

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

module.exports = router;
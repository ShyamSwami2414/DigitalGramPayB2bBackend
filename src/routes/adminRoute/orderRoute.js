const express = require("express");
const router = express.Router();
const { getOrderList, updateOrderStatus } = require("../../controllers/adminController/orderController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");



router.get(
    "/all-orders",
    authenticateUser,
    authorizeRoles("admin"),
    getOrderList
);

router.patch(
    "/update-order-status/:id",
    authenticateUser,
    authorizeRoles("admin"),
    updateOrderStatus
);


module.exports = router;
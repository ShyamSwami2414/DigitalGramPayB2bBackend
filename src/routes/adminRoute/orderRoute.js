const express = require("express");
const router = express.Router();
const {
  getOrderList,
  updateOrderStatus,
  getOrderById,
} = require("../../controllers/adminController/orderController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");

router.get(
  "/all-orders",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ECOMMERCE"),
  getOrderList,
);

router.get(
  "/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ECOMMERCE"),
  getOrderById,
);

router.patch(
  "/update-order-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ECOMMERCE"),
  updateOrderStatus,
);

module.exports = router;

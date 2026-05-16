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

const asyncHandler = require("../../utils/asyncHandler");

router.get(
  "/all-orders",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ECOMMERCE"),
  asyncHandler(getOrderList),
);

router.get(
  "/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ECOMMERCE"),
  asyncHandler(getOrderById),
);

router.patch(
  "/update-order-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ECOMMERCE"),
  asyncHandler(updateOrderStatus),
);

module.exports = router;

const express = require("express");
const {
  getCouponList,
  createCoupon,
  toggleCoupon,
  deleteCoupon,
} = require("../../controllers/adminController/couponController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/coupon-list",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("COUPON"),
  asyncHandler(getCouponList),
);

router.post(
  "/create-coupon",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("COUPON"),
  asyncHandler(createCoupon),
);

router.patch(
  "/toggle-coupon/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("COUPON"),
  asyncHandler(toggleCoupon),
);

router.delete(
  "/delete-coupon/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("COUPON"),
  asyncHandler(deleteCoupon),
);

module.exports = router;

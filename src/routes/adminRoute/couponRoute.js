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
const router = express.Router();

router.get(
  "/coupon-list",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("COUPON"),
  getCouponList,
);

router.post(
  "/create-coupon",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("COUPON"),
  createCoupon,
);

router.patch(
  "/toggle-coupon/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("COUPON"),
  toggleCoupon,
);

router.delete(
  "/delete-coupon/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("COUPON"),
  deleteCoupon,
);

module.exports = router;

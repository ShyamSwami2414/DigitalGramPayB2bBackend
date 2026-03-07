const express = require("express");
const {
  getCouponList,
  createCoupon,
  toggleCoupon,
  deleteCoupon,
} = require("../../controllers/adminController/couponController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.get(
  "/coupon-list",
  authenticateUser,
  authorizeRoles("admin"),
  getCouponList,
);

router.post(
  "/create-coupon",
  authenticateUser,
  authorizeRoles("admin"),
  createCoupon,
);

router.patch(
  "/toggle-coupon/:id",
  authenticateUser,
  authorizeRoles("admin"),
  toggleCoupon,
);

router.delete(
  "/delete-coupon/:id",
  authenticateUser,
  authorizeRoles("admin"),
  deleteCoupon,
);

module.exports = router;

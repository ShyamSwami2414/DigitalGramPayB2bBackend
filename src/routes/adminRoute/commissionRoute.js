const express = require("express");
const {
  getCommissionList,
  createCommission,
  deleteCommissionPlan,
} = require("../../controllers/adminController/commissionController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/commission-list",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("COMMISSION"),
  asyncHandler(getCommissionList),
);

router.post(
  "/create-commission",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("COMMISSION"),
  asyncHandler(createCommission),
);

router.delete(
  "/delete-commission-plan",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("COMMISSION"),
  asyncHandler(deleteCommissionPlan),
);

module.exports = router;

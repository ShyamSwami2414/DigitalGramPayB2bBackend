const express = require("express");
const {
  setOnBoardCharges,
  getOnBoardCharges,
  updateCharge,
  getAllIdChargeRequest,
  approveIdChargeRequest,
  rejectIdChargeRequest,
  togglePaymentRequired,
} = require("../../controllers/adminController/chargeController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/get-id-charge-requests",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("IDCHARGE"),
  asyncHandler(getAllIdChargeRequest),
);

router.patch(
  "/approve-id-charge-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("IDCHARGE"),
  asyncHandler(approveIdChargeRequest),
);

router.patch(
  "/reject-id-charge-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("IDCHARGE"),
  asyncHandler(rejectIdChargeRequest),
);

router.post(
  "/set-charges",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("IDCHARGE"),
  asyncHandler(setOnBoardCharges),
);

router.get(
  "/get-charges",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("IDCHARGE"),
  asyncHandler(getOnBoardCharges),
);

router.put(
  "/update-charge/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("IDCHARGE"),
  asyncHandler(updateCharge),
);

router.patch(
  "/toggle-payment-required/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("IDCHARGE"),
  asyncHandler(togglePaymentRequired),
);

module.exports = router;

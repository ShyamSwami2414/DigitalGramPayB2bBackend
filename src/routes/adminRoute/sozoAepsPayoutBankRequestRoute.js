const express = require("express");
const router = express.Router();

const {
  aepsPayoutBankRequests,
  approveRejectAepsPayoutBankRequest,
} = require("../../controllers/adminController/instantAepsPayoutBankRequestController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");

const asyncHandler = require("../../utils/asyncHandler");

router.get(
  "/payout-bank-requests",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PAYOUT_BANK"),
  asyncHandler(aepsPayoutBankRequests),
);

router.patch(
  "/approve-reject-bank-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PAYOUT_BANK"),
  asyncHandler(approveRejectAepsPayoutBankRequest),
);

module.exports = router;

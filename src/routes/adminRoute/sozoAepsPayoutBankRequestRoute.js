const express = require("express");
const router = express.Router();

const {
  aepsPayoutBankRequests,
  approveRejectAepsPayoutBankRequest,
} = require("../../controllers/adminController/instantAepsPayoutBankRequestController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");

router.get(
  "/payout-bank-requests",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PAYOUT_BANK"),
  aepsPayoutBankRequests,
);

router.patch(
  "/approve-reject-bank-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PAYOUT_BANK"),
  approveRejectAepsPayoutBankRequest,
);

module.exports = router;

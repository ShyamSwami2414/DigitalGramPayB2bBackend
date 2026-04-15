const express = require("express");
const router = express.Router();

const {
  payoutBankRequests,
  approveRejectPayoutBankRequest,
} = require("../../controllers/adminController/payoutBankRequestController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");

router.get(
  "/payout-bank-requests",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PAYOUT_BANK"),
  payoutBankRequests,
);

router.patch(
  "/approve-reject-bank-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("PAYOUT_BANK"),
  approveRejectPayoutBankRequest,
);

module.exports = router;

const express = require("express");
const {
  aepsToEwalletHistory,
  getAllLedgetEntryList,
} = require("../../controllers/adminController/walletLedgerController");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const router = express.Router();

router.get(
  "/aeps-to-ewallet-history",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("REPORTS"),
  aepsToEwalletHistory,
);

router.get(
  "/all-ledger-entry-list",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("REPORTS"),
  getAllLedgetEntryList,
);

module.exports = router;

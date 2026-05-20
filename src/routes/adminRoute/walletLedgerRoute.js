const express = require("express");
const {
  aepsToEwalletHistory,
  getAllLedgetEntryList,
  getAdminWalletStats,
} = require("../../controllers/adminController/walletLedgerController");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/aeps-to-ewallet-history",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("REPORTS"),
  asyncHandler(aepsToEwalletHistory),
);

router.get(
  "/all-ledger-entry-list",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("REPORTS"),
  asyncHandler(getAllLedgetEntryList),
);

//stats combined from both ledger  and reports
router.get(
  "/wallet-stats",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("REPORTS"),
  asyncHandler(getAdminWalletStats),
);

module.exports = router;

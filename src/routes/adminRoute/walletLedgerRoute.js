const express = require("express");
const {
  aepsToEwalletHistory,
  getAllLedgetEntryList,
} = require("../../controllers/adminController/walletLedgerController");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { authenticateUser } = require("../../middleware/authMiddleware");
const router = express.Router();

router.get(
  "/aeps-to-ewallet-history",
  authenticateUser,
  authorizeRoles("admin"),
  aepsToEwalletHistory,
);

router.get(
  "/all-ledger-entry-list",
  authenticateUser,
  authorizeRoles("admin"),
  getAllLedgetEntryList,
);

module.exports = router;

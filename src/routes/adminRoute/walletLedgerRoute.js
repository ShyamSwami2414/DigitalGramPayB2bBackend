const express = require("express");
const { aepsToEwalletHistory } = require("../../controllers/adminController/walletLedgerController");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { authenticateUser } = require("../../middleware/authMiddleware");
const router = express.Router();

router.get(
    "/aeps-to-ewallet-history",
    authenticateUser,
    authorizeRoles("admin"),
    aepsToEwalletHistory
);

module.exports = router;
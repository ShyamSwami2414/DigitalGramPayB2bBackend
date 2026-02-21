const express = require("express");
const router = express.Router();

const { payoutBankRequests, approveRejectPayoutBankRequest } = require("../../controllers/adminController/payoutBankRequestController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

router.get("/payout-bank-requests",
    authenticateUser,
    authorizeRoles("admin"),
    payoutBankRequests
);

router.patch(
    "/approve-reject-bank-request/:id",
    authenticateUser,
    authorizeRoles("admin"),
    approveRejectPayoutBankRequest
);

module.exports = router;
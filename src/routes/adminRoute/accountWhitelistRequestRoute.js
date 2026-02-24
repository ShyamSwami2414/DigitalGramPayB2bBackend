const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { getAccountWhitelistRequest, approveRejectRequest } = require("../../controllers/adminController/accountWhitelistRequestController");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.get(
    "/account-whitelist-requests",
    authenticateUser,
    authorizeRoles("admin"),
    getAccountWhitelistRequest
);

router.patch(
    "/approve-reject-request/:id",
    authenticateUser,
    authorizeRoles("admin"),
    approveRejectRequest
);

module.exports = router;
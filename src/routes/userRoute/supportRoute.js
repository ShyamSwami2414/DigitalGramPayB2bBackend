const express = require("express");
const {
    createSupportRequest,
    getMySupportRequests,
    getTicketStats,
} = require("../../controllers/userController/supportController");

const { authenticateUser } = require("../../middleware/authMiddleware");
const router = express.Router();

router.get(
    "/get-ticket-stats",
    authenticateUser,
    getTicketStats
);

router.get(
    "/get-my-support-requests",
    authenticateUser,
    getMySupportRequests
);

router.post(
    "/create-support-request",
    authenticateUser,
    createSupportRequest
);

module.exports = router;

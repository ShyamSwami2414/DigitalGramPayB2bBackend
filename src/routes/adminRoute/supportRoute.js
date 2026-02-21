const express = require("express");
const router = express.Router();
const { getSupportRequests, getSupportStats } = require("../../controllers/adminController/supportController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

router.get("/support-stats",
    authenticateUser,
    authorizeRoles("admin"),
    getSupportStats
);

router.get("/all-support-requests",
    authenticateUser,
    authorizeRoles("admin"),
    getSupportRequests
);

module.exports = router;
const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { getLoginLogs } = require("../../controllers/adminController/loginLogsController");
const router = express.Router();

router.get("/login-logs", authenticateUser, authorizeRoles("admin"), getLoginLogs);

module.exports = router;
const express = require("express");
const {
    createSupportRequest,
} = require("../../controllers/userController/supportController");

const { authenticateUser } = require("../../middleware/authMiddleware");
const router = express.Router();

router.post("/create-support-request", authenticateUser, createSupportRequest);

module.exports = router;

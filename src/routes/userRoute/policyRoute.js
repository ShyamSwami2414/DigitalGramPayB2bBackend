const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middleware/authMiddleware");

const {
  getPolicyByType,
} = require("../../controllers/userController/policyController");

router.get("/policy-by-type", authenticateUser, getPolicyByType);

module.exports = router;

const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middleware/authMiddleware");

const {
  getPolicyByType,
} = require("../../controllers/userController/policyController");

const asyncHandler = require("../../utils/asyncHandler");

router.get("/policy-by-type",  asyncHandler(getPolicyByType));

module.exports = router;

const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  getStateList,
} = require("../../controllers/userController/ekoStateController");

const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

router.get("/state-list", authenticateUser, asyncHandler(getStateList));

module.exports = router;

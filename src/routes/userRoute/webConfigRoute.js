const express = require("express");
const router = express.Router();

const {
  getWebSettings,
} = require("../../controllers/userController/webConfigController");
const { authenticateUser } = require("../../middleware/authMiddleware");

const asyncHandler = require("../../utils/asyncHandler");

router.get(
  "/list",
  // authenticateUser,
  asyncHandler(getWebSettings),
);

module.exports = router;

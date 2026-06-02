const express = require("express");
const {
  getActiveOperatorList,
} = require("../../controllers/adminController/operatorController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/get-active-operators",
  authenticateUser,
  authorizeRoles("admin"),
  asyncHandler(getActiveOperatorList),
);

module.exports = router;

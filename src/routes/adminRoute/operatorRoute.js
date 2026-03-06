const express = require("express");
const {
  getActiveOperatorList,
} = require("../../controllers/adminController/operatorController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.get(
  "/get-active-operators",
  authenticateUser,
  authorizeRoles("admin"),
  getActiveOperatorList,
);

module.exports = router;

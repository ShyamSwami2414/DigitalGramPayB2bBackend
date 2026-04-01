const express = require("express");
const {
  getCompleteHoldReleaseHistory,
} = require("../../controllers/adminController/holdReleaseHistoryController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.get(
  "/complete-history",
  authenticateUser,
  authorizeRoles("admin"),
  getCompleteHoldReleaseHistory,
);

module.exports = router;

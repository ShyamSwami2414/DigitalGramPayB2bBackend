const express = require("express");
const router = express.Router();
const {
  getSupportRequests,
  getSupportStats,
  updateSupportStatus,
  getSupportRequestById,
  addRemark,
} = require("../../controllers/adminController/supportController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");

router.get(
  "/support-stats",
  authenticateUser,
  authorizeRoles("admin"),
  getSupportStats,
);

router.get(
  "/all-support-requests",
  authenticateUser,
  authorizeRoles("admin"),
  getSupportRequests,
);

router.get(
  "/support-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  getSupportRequestById,
);

router.patch(
  "/update-support-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  updateSupportStatus,
);

router.patch(
  "/add-remark/:id",
  authenticateUser,
  authorizeRoles("admin"),
  addRemark,
);

module.exports = router;

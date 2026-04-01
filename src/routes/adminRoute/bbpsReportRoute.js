const express = require("express");
const {
  getBbpsStats,
  getBbpsReport,
  getBbpsReportById,
} = require("../../controllers/adminController/bbpsReportController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.get(
  "/bbps-service-stats",
  authenticateUser,
  authorizeRoles("admin"),
  getBbpsStats,
);

router.get(
  "/bbps-service-report",
  authenticateUser,
  authorizeRoles("admin"),
  getBbpsReport,
);

//report view by id
router.get(
  "/bbps-service-report/:id",
  authenticateUser,
  authorizeRoles("admin"),
  getBbpsReportById,
);

module.exports = router;

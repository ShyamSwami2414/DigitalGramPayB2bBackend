const express = require("express");
const {
  getRechargeStats,
  getRechargeReport,
  getRechargeReportById,
} = require("../../controllers/adminController/rechargeReportController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.get(
  "/recharge-service-stats",
  authenticateUser,
  authorizeRoles("admin"),
  getRechargeStats,
);

router.get(
  "/recharge-service-report",
  authenticateUser,
  authorizeRoles("admin"),
  getRechargeReport,
);

//report view by id
router.get(
  "/recharge-service-report/:id",
  authenticateUser,
  authorizeRoles("admin"),
  getRechargeReportById,
);

module.exports = router;

const express = require("express");
const {
  getCommissionList,
  createCommission,
  deleteCommissionPlan,
} = require("../../controllers/adminController/commissionController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.get(
  "/commission-list",
  authenticateUser,
  authorizeRoles("admin"),
  getCommissionList,
);

router.post(
  "/create-commission",
  authenticateUser,
  authorizeRoles("admin"),
  createCommission,
);

router.delete(
  "/delete-commission-plan",
  authenticateUser,
  authorizeRoles("admin"),
  deleteCommissionPlan,
);

module.exports = router;

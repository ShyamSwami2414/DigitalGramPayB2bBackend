const express = require("express");
const router = express.Router();

const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const {
  getPolicyByType,
  addPolicy,
  updatePolicy,
  deletePolicy,
} = require("../../controllers/adminController/policyController");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");

router.get(
  "/policy-by-type",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  getPolicyByType,
);
router.post(
  "/add-policy",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  addPolicy,
);

router.put(
  "/update-policy/:type",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  updatePolicy,
);

router.delete(
  "/delete-policy/:type",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  deletePolicy,
);

module.exports = router;

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

const asyncHandler = require("../../utils/asyncHandler");

router.get(
  "/policy-by-type",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  asyncHandler(getPolicyByType),
);
router.post(
  "/add-policy",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  asyncHandler(addPolicy),
);

router.put(
  "/update-policy/:type",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  asyncHandler(updatePolicy),
);

router.delete(
  "/delete-policy/:type",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SETTINGS"),
  asyncHandler(deletePolicy),
);

module.exports = router;

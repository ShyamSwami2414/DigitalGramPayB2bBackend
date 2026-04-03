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

router.get(
  "/policy-by-type",
  authenticateUser,
  authorizeRoles("admin"),
  getPolicyByType,
);
router.post(
  "/add-policy",
  authenticateUser,
  authorizeRoles("admin"),
  addPolicy,
);

router.put(
  "/update-policy/:type",
  authenticateUser,
  authorizeRoles("admin"),
  updatePolicy,
);

router.delete(
  "/delete-policy/:type",
  authenticateUser,
  authorizeRoles("admin"),
  deletePolicy,
);

module.exports = router;

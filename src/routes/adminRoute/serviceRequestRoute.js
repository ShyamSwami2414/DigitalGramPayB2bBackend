const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  getAllServiceRequest,
} = require("../../controllers/userController/serviceRequestController");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const {
  listAllServiceRequest,
} = require("../../controllers/adminController/serviceRequestController");
const router = express.Router();

router.get(
  "/list-service-request",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SERVICE"),
  listAllServiceRequest,
);

module.exports = router;

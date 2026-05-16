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
  approveServiceRequest,
  rejectServiceRequest,
} = require("../../controllers/adminController/serviceRequestController");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/list-service-request",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SERVICE"),
  asyncHandler(listAllServiceRequest),
);

router.patch(
  "/approve-service-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ACCOUNT_WHITELIST"),
  asyncHandler(approveServiceRequest),
);

router.patch(
  "/reject-service-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ACCOUNT_WHITELIST"),
  asyncHandler(rejectServiceRequest),
);

module.exports = router;

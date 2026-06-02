const express = require("express");
const {
  listAllOfflineServices,
  getFormByServiceId,
} = require("../../controllers/userController/offlineServiceController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const validatePipeline = require("../../middleware/pipelineCheckMiddleware");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();
router.use(validatePipeline("offline-service"));

router.get(
  "/all-offline-service",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(listAllOfflineServices),
);

router.get(
  "/offline-service-form/:id",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getFormByServiceId),
);

module.exports = router;

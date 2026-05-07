const express = require("express");
const {
  listAllOnlineServices,
} = require("../../controllers/userController/onlineServiceController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const validatePipeline = require("../../middleware/pipelineCheckMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const router = express.Router();
router.use(validatePipeline("online-service"));

router.get(
  "/all-online-service",
  authenticateUser,
  checkUserPaymentAndKYC,
  listAllOnlineServices,
);

module.exports = router;

const express = require("express");
const {
  listAllOnlineServices,
} = require("../../controllers/userController/onlineServiceController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const router = express.Router();

router.get(
  "/all-online-service",
  authenticateUser,
  checkUserPaymentAndKYC,
  listAllOnlineServices,
);

module.exports = router;

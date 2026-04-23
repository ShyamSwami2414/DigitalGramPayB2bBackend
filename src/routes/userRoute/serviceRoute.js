const express = require("express");
const {
  getServiceList,
  serviceListWithPipeline,
} = require("../../controllers/userController/serviceController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const router = express.Router();

router.get(
  "/all-service-list",
  authenticateUser,
  checkUserPaymentAndKYC,
  getServiceList,
);

router.get(
  "/list",
  authenticateUser,
  checkUserPaymentAndKYC,
  serviceListWithPipeline,
);

module.exports = router;

const express = require("express");
const {
  getServiceList,
  serviceListWithPipeline,
} = require("../../controllers/userController/serviceController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/all-service-list",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getServiceList),
);

router.get(
  "/list",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(serviceListWithPipeline),
);

module.exports = router;

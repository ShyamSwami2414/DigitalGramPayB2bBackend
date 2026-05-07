const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");

const {
  fetchBbpsCategories,
  fetchParticularCategoryBillersList,
  fetchBbpsBillerInfo,
  fetchBbpsBill,
  validateBbpsBill,
  payBbpsBill,
} = require("../../controllers/userController/billPaymentController");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");

const apiLogger = require("../../middleware/apiLogger");
const validatePipeline = require("../../middleware/pipelineCheckMiddleware");
const router = express.Router();

router.use(validatePipeline("bbps1"));

router.get(
  "/fetch-bbps-categories",
  authenticateUser,
  checkUserPaymentAndKYC,
  fetchBbpsCategories,
);
router.get(
  "/fetch-particular-category-billers",
  authenticateUser,
  checkUserPaymentAndKYC,
  fetchParticularCategoryBillersList,
);

// -----------------------------TPA------------------------------

router.get(
  "/fetch-biller-info",
  authenticateUser,
  checkUserPaymentAndKYC,
  fetchBbpsBillerInfo,
);
router.post(
  "/fetch-bill",
  authenticateUser,
  checkUserPaymentAndKYC,
  fetchBbpsBill,
);

router.post(
  "/validate-bill",
  authenticateUser,
  checkUserPaymentAndKYC,
  validateBbpsBill,
);

router.post(
  "/bill-pay",
  authenticateUser,
  checkUserPaymentAndKYC,
  idempotencyMiddleware,
  apiLogger,
  payBbpsBill,
);

// -----------------------------TPA------------------------------

module.exports = router;

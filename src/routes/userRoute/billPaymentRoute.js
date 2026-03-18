const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
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
const router = express.Router();

router.get("/fetch-bbps-categories", authenticateUser, fetchBbpsCategories);
router.get(
  "/fetch-particular-category-billers",
  authenticateUser,
  fetchParticularCategoryBillersList,
);

// -----------------------------TPA------------------------------

router.get("/fetch-biller-info", authenticateUser, fetchBbpsBillerInfo);
router.post("/fetch-bill", authenticateUser, fetchBbpsBill);
router.post("/validate-bill", authenticateUser, validateBbpsBill);
router.post(
  "/bill-pay",
  authenticateUser,
  idempotencyMiddleware,
  apiLogger,
  payBbpsBill,
);

// -----------------------------TPA------------------------------

module.exports = router;

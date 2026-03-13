const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  fetchBbpsCategories,
  fetchParticularCategoryBillersList,
  fetchBbpsBillerInfo,
  fetchBbpsBill,
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

// -----------------------------TPA------------------------------

module.exports = router;

const express = require("express");
const {
  refillUserWallet,
} = require("../../controllers/userController/userWalletRefillController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");
const router = express.Router();

router.post(
  "/refill-user-wallet",
  authenticateUser,
  idempotencyMiddleware,
  refillUserWallet,
);

module.exports = router;

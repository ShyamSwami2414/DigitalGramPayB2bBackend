const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  addIdChargeRequest,
} = require("../../controllers/userController/idChargeController");
const createUploader = require("../../middleware/uploadMiddleware");
const multerErrorHandler = require("../../middleware/multerErrorHandler");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");

const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

const upload = createUploader("paymentProof", /jpeg|jpg|png|pdf/, 2048);

router.post(
  "/add-id-charge-request",
  authenticateUser,
  multerErrorHandler(upload.single("paymentProof")),
  idempotencyMiddleware,
  asyncHandler(addIdChargeRequest),
);

module.exports = router;

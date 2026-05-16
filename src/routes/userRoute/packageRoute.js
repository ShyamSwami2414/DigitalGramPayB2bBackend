const express = require("express");
const {
  getAllPackages,
} = require("../../controllers/userController/packageController");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get("/get-packages", asyncHandler(getAllPackages));

module.exports = router;

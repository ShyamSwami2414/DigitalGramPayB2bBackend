const express = require("express");
const {
  getAllPackages,
} = require("../../controllers/userController/packageController");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const router = express.Router();

router.get("/get-packages", getAllPackages);

module.exports = router;

const express = require("express");
const {
  kycSubmission,
} = require("../../controllers/userController/kycController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const createUploader = require("../../middleware/uploadMiddleware");
const router = express.Router();

const kycUpload = createUploader("kyc", /jpeg|jpg|png|pdf/, 15);

router.post(
  "/kyc-submission",
  authenticateUser,
  kycUpload.fields([
    { name: "aadharFile", maxCount: 1 },
    { name: "panFile", maxCount: 1 },
    { name: "shopImage", maxCount: 1 },
  ]),
  kycSubmission,
);

module.exports = router;

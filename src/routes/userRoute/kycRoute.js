const express = require("express");
const {
  kycSubmission,
} = require("../../controllers/userController/kycController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const kycUpload = require("../../middleware/kycUploadMiddleware");
const router = express.Router();

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

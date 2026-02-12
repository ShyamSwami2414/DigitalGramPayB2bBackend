const express = require("express");
const { kycSubmission } = require("../../controllers/userController/kycController");
const router = express.Router();

router.post("/kyc-submission", kycSubmission)

module.exports = router;
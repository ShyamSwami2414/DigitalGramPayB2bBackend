const express = require("express");
const { getKycData } = require("../../controllers/adminController/kycController");
const router = express.Router();

router.get("/get-kycs", getKycData);

module.exports = router;
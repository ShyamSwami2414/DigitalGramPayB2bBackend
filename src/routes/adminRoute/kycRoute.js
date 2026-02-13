const express = require("express");
const {
  getKycData,
} = require("../../controllers/adminController/kycController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.get("/get-kycs", authenticateUser, authorizeRoles("admin"), getKycData);

module.exports = router;

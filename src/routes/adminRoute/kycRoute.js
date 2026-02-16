const express = require("express");
const {
  updateKycStatus,
  getKycData,
} = require("../../controllers/adminController/kycController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.get("/get-kycs", authenticateUser, authorizeRoles("admin"), getKycData);

router.put(
  "/update-kyc-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  updateKycStatus,
);

module.exports = router;

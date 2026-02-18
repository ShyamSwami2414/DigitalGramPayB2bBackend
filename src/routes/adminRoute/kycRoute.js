const express = require("express");
const {
  updateSectionStatus,
  updateOverAllKycStatus,
  getKycData,
  getKycById,
  getKycByUserId
} = require("../../controllers/adminController/kycController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.get("/get-kycs", authenticateUser, authorizeRoles("admin"), getKycData);
router.get("/get-kyc/:id", authenticateUser, authorizeRoles("admin"), getKycById);
router.get("/get-kyc-by-userId/:userId", authenticateUser, authorizeRoles("admin"), getKycByUserId);

router.patch(
  "/update-section-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  updateSectionStatus,
);

router.patch(
  "/update-kyc-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  updateOverAllKycStatus,
);

module.exports = router;

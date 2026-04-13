const express = require("express");
const {
  updateSectionStatus,
  updateOverAllKycStatus,
  getKycData,
  getKycById,
  getKycByUserId,
  requestReKyc,
} = require("../../controllers/adminController/kycController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const router = express.Router();

router.get("/get-kycs", authenticateUser, authorizeRoles("admin"), getKycData);
router.get(
  "/get-kyc/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("KYC"),
  getKycById,
);
router.get(
  "/get-kyc-by-userId/:userId",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission(["KYC", "USERS"]),
  getKycByUserId,
);

router.patch(
  "/update-section-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("KYC"),
  updateSectionStatus,
);

router.patch(
  "/update-kyc-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("KYC"),
  updateOverAllKycStatus,
);

router.patch(
  "/request-rekyc/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("KYC"),
  requestReKyc,
);

module.exports = router;

const express = require("express");
const {
  getUserRoles,
  getRoleListForSignUp,
} = require("../../controllers/userController/roleController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get("/get-role-list", asyncHandler(getRoleListForSignUp));
router.get(
  "/get-roles",
  authenticateUser,
  checkUserPaymentAndKYC,
  asyncHandler(getUserRoles),
);

module.exports = router;

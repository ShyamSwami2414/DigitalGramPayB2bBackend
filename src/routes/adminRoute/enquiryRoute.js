const express = require("express");
const router = express.Router();

const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const {
  getEnquiries,
} = require("../../controllers/adminController/enquiryController");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");

const asyncHandler = require("../../utils/asyncHandler");

router.get(
  "/all-enquiries",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ENQUIRY"),
  asyncHandler(getEnquiries),
);

module.exports = router;

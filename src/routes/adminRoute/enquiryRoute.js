const express = require("express");
const router = express.Router();

const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const {
  getEnquiries,
} = require("../../controllers/adminController/enquiryController");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");

router.get(
  "/all-enquiries",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("ENQUIRY"),
  getEnquiries,
);

module.exports = router;

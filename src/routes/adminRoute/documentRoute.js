const express = require("express");
const {
  getAllDocumentOptionList,
} = require("../../controllers/adminController/documentController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const router = express.Router();

router.get(
  "/document-options",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("OFFLINE_SERVICE"),
  getAllDocumentOptionList,
);

module.exports = router;

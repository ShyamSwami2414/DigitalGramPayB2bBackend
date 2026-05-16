const express = require("express");
const {
  getAllFieldOptionList,
} = require("../../controllers/adminController/fieldController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

router.get(
  "/field-options",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("OFFLINE_SERVICE"),
  asyncHandler(getAllFieldOptionList),
);

module.exports = router;

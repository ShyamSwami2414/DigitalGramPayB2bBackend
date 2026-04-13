const express = require("express");
const {
  createService,
  getActiveServiceList,
  updateService,
  updateServiceStatus,
  deleteService,
} = require("../../controllers/adminController/serviceController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const router = express.Router();

// router.post(
//   "/create-service",
//   authenticateUser,
//   authorizeRoles("admin"),
//  checkAllowedPermission("SERVICE"),
//   createService,
// );

router.get(
  "/get-services",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SERVICE"),
  getActiveServiceList,
);

// router.put(
//   "/update-service/:id",
//   authenticateUser,
//   authorizeRoles("admin"),
// checkAllowedPermission("SERVICE"),
//   updateService,
// );

// router.patch(
//   "/update-service-status/:id",
//   authenticateUser,
//   authorizeRoles("admin"),
// checkAllowedPermission("SERVICE"),
//   updateServiceStatus,
// );

// router.delete(
//   "/delete-service/:id",
//   authenticateUser,
//   authorizeRoles("admin"),
// checkAllowedPermission("SERVICE"),
//   deleteService,
// );

module.exports = router;

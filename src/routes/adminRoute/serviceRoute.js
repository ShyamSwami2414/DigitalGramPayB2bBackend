const express = require("express");
const {
  createService,
  serviceListWithPipeline,
  getActiveServiceList,
  getSelectedServicePipelineList,
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
  "/list",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SERVICE"),
  serviceListWithPipeline,
);

router.get(
  "/get-services",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SERVICE"),
  getActiveServiceList,
);

router.get(
  "/get-pipeline",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("SERVICE"),
  getSelectedServicePipelineList,
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

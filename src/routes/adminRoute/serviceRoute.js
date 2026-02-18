const express = require("express");
const {
  createService,
  getAllServices,
  updateService,
  updateServiceStatus,
  deleteService,
} = require("../../controllers/adminController/serviceController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.post(
  "/create-service",
  authenticateUser,
  authorizeRoles("admin"),
  createService,
);

router.get(
  "/get-services",
  authenticateUser,
  authorizeRoles("admin"),
  getAllServices,
);

router.put(
  "/update-service/:id",
  authenticateUser,
  authorizeRoles("admin"),
  updateService,
);

router.patch(
  "/update-service-status/:id",
  authenticateUser,
  authorizeRoles("admin"),
  updateServiceStatus,
);

router.delete(
  "/delete-service/:id",
  authenticateUser,
  authorizeRoles("admin"),
  deleteService,
);


module.exports = router;

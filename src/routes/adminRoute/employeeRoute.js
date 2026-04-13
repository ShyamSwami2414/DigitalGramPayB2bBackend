const express = require("express");
const router = express.Router();

const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const {
  addEmployee,
  getEmployeeList,
  updateEmployee,
  deleteEmployee,
  getEmployeeById,
  getEmployeeStats,
} = require("../../controllers/adminController/employeeController");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");

router.get(
  "/employee-stats",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("EMPLOYEE"),
  getEmployeeStats,
);

router.get(
  "/employee-list",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("EMPLOYEE"),
  getEmployeeList,
);

router.get(
  "/employee/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("EMPLOYEE"),
  getEmployeeById,
);

router.post(
  "/add-employee",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("EMPLOYEE"),
  addEmployee,
);

router.put(
  "/update-employee/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("EMPLOYEE"),
  updateEmployee,
);

router.delete(
  "/delete-employee/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("EMPLOYEE"),
  deleteEmployee,
);

module.exports = router;

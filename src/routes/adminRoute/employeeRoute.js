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

const asyncHandler = require("../../utils/asyncHandler");

router.get(
  "/employee-stats",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("EMPLOYEE"),
  asyncHandler(getEmployeeStats),
);

router.get(
  "/employee-list",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("EMPLOYEE"),
  asyncHandler(getEmployeeList),
);

router.get(
  "/employee/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("EMPLOYEE"),
  asyncHandler(getEmployeeById),
);

router.post(
  "/add-employee",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("EMPLOYEE"),
  asyncHandler(addEmployee),
);

router.put(
  "/update-employee/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("EMPLOYEE"),
  asyncHandler(updateEmployee),
);

router.delete(
  "/delete-employee/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("EMPLOYEE"),
  asyncHandler(deleteEmployee),
);

module.exports = router;

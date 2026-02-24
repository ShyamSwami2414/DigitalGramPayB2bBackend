const express = require("express");
const router = express.Router();

const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { addEmployee, getEmployeeList, updateEmployee, deleteEmployee, getEmployeeById } = require("../../controllers/adminController/employeeController");

router.get(
    "/employee-list",
    authenticateUser,
    authorizeRoles("admin"),
    getEmployeeList
);

router.get(
    "/employee/:id",
    authenticateUser,
    authorizeRoles("admin"),
    getEmployeeById
);

router.post(
    "/add-employee",
    authenticateUser,
    authorizeRoles("admin"),
    addEmployee
);

router.put(
    "/update-employee/:id",
    authenticateUser,
    authorizeRoles("admin"),
    updateEmployee
);

router.delete(
    "/delete-employee/:id",
    authenticateUser,
    authorizeRoles("admin"),
    deleteEmployee
);

module.exports = router;
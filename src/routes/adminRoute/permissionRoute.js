const express = require("express");
const router = express.Router()

const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { getPermissionList } = require("../../controllers/adminController/permissionController");

router.get("/permission-list",
    authenticateUser,
    authorizeRoles("admin"),
    getPermissionList
);


module.exports = router;
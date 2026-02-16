const express = require("express");
const {
  getUserRoles,
  createRole,
} = require("../../controllers/adminController/roleController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.post("/create-role", authenticateUser, authorizeRoles("admin"), createRole);
router.get("/get-roles", authenticateUser, authorizeRoles("admin"), getUserRoles);

module.exports = router;

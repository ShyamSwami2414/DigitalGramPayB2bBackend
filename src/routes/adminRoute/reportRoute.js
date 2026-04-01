const express = require("express");
const {
  getServiceWiseReport,
} = require("../../controllers/adminController/reportController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

// router.get(
//   "/service-wise-report",
//   authenticateUser,
//   authorizeRoles("admin"),
//   getServiceWiseReport,
// );

module.exports = router;

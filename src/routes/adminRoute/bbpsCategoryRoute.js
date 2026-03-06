const express = require("express");
const {
  getActiveBbpsCategoryList,
} = require("../../controllers/adminController/bbpsCategoryController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.get(
  "/get-active-bbpsCategory",
  authenticateUser,
  authorizeRoles("admin"),
  getActiveBbpsCategoryList,
);

module.exports = router;

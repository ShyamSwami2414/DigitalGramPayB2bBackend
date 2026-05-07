const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  getStateList,
} = require("../../controllers/userController/ekoStateController");

const router = express.Router();

router.get("/state-list", authenticateUser, getStateList);

module.exports = router;

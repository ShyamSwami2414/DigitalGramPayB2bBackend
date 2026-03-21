const express = require("express");
const {
  getAllStatesList,
  getStateWiseCityList,
} = require("../../controllers/userController/stateCityController");
const { authenticateUser } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/all-state-list", authenticateUser, getAllStatesList);
router.get(
  "/state-wise-city-list",
  authenticateUser,
  getStateWiseCityList,
);

module.exports = router;

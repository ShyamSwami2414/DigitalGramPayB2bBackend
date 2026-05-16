const express = require("express");
const {
  getAllStatesList,
  getStateWiseCityList,
} = require("../../controllers/userController/stateCityController");
const { authenticateUser } = require("../../middleware/authMiddleware");

const asyncHandler = require("../../utils/asyncHandler");

const router = express.Router();

router.get("/all-state-list", authenticateUser, asyncHandler(getAllStatesList));
router.get(
  "/state-wise-city-list",
  authenticateUser,
  asyncHandler(getStateWiseCityList),
);

module.exports = router;

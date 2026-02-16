const express = require("express");
const {
  setOnBoardCharges,
  getOnBoardCharges,
  updateCharge,
} = require("../../controllers/adminController/chargeController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.post(
  "/set-charges",
  authenticateUser,
  authorizeRoles("admin"),
  setOnBoardCharges,
);

router.get(
  "/get-charges",
  authenticateUser,
  authorizeRoles("admin"),
  getOnBoardCharges,
);

router.put("/update-charge/:id", updateCharge)

module.exports = router;

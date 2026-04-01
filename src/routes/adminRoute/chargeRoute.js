const express = require("express");
const {
  setOnBoardCharges,
  getOnBoardCharges,
  updateCharge,
  getAllIdChargeRequest,
  approveIdChargeRequest,
  rejectIdChargeRequest,
  togglePaymentRequired,
} = require("../../controllers/adminController/chargeController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.get(
  "/get-id-charge-requests",
  authenticateUser,
  authorizeRoles("admin"),
  getAllIdChargeRequest,
);

router.patch(
  "/approve-id-charge-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  approveIdChargeRequest,
);

router.patch(
  "/reject-id-charge-request/:id",
  authenticateUser,
  authorizeRoles("admin"),
  rejectIdChargeRequest,
);

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

router.put(
  "/update-charge/:id",
  authenticateUser,
  authorizeRoles("admin"),
  updateCharge,
);

router.patch(
  "/toggle-payment-required/:id",
  authenticateUser,
  authorizeRoles("admin"),
  togglePaymentRequired,
);

module.exports = router;

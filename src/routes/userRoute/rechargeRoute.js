const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const {
  getAllOperatorCodeList,
  getAllCircleCodeList,
  mobileVerify,
  fetchPlan,
  doMobilePrepaidRecharge,
} = require("../../controllers/userController/rechargeController");
const idempotencyMiddleware = require("../../middleware/idempotencyMiddleware");
const router = express.Router();

router.get("/operator-list", authenticateUser, getAllOperatorCodeList);
router.get("/circle-list", authenticateUser, getAllCircleCodeList);

router.get("/mobile-verify/:mobile", authenticateUser, mobileVerify);
router.get("/fetch-plan", authenticateUser, fetchPlan);

router.post(
  "/mobile-prepaid-recharge",
  authenticateUser,
  idempotencyMiddleware,
  doMobilePrepaidRecharge,
);

module.exports = router;

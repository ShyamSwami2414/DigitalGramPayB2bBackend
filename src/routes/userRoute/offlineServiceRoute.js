const express = require("express");
const {
    listAllOfflineServices,
    getFormByServiceId,
} = require("../../controllers/userController/offlineServiceController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkUserPaymentAndKYC = require("../../middleware/kycPaymentCheckMiddleware");
const router = express.Router();


router.get(
    "/all-offline-service",
    authenticateUser,
    checkUserPaymentAndKYC,
    listAllOfflineServices,
);

router.get(
    "/offline-service-form/:id",
    authenticateUser,
    checkUserPaymentAndKYC,
    getFormByServiceId,
);

module.exports = router;

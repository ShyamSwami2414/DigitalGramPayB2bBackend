const express = require("express");
const {
    listAllOfflineServices,
    getFormByServiceId,
} = require("../../controllers/userController/offlineServiceController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();


router.get(
    "/all-offline-service",
    authenticateUser,
    listAllOfflineServices,
);

router.get(
    "/offline-service-form/:id",
    authenticateUser,
    getFormByServiceId,
);

module.exports = router;

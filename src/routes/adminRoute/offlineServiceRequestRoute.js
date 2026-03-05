const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const {
    getOfflineServiceRequestById,
    listOfflineServiceRequests,
    updateOfflineServiceRequestStatus,
    deleteOfflineServiceRequest
} = require("../../controllers/adminController/offlineServiceRequestController");

const router = express.Router();

router.get(
    "/list-offline-service-requests",
    authenticateUser,
    authorizeRoles("admin"),
    listOfflineServiceRequests
)

router.get(
    "/offline-service-request/:id",
    authenticateUser,
    authorizeRoles("admin"),
    getOfflineServiceRequestById
)

router.delete(
    "/delete-offline-service-request/:id",
    authenticateUser,
    authorizeRoles("admin"),
    deleteOfflineServiceRequest
)

router.put(
    "/update-service-request-status/:id",
    authenticateUser,
    authorizeRoles("admin"),
    updateOfflineServiceRequestStatus
)

module.exports = router;


const express = require("express");
const {
    getAllUserRequests,
    updateUserRequestStatus,
} = require("../../controllers/adminController/userRequestController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.get(
    "/get-user-requests",
    authenticateUser,
    authorizeRoles("admin"),
    getAllUserRequests,
);

router.patch(
    "/update-request-status/:id",
    authenticateUser,
    authorizeRoles("admin"),
    updateUserRequestStatus
);

module.exports = router;

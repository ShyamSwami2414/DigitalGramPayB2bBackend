const express = require("express");
const {
    createOfflineService,
    listAllOfflineServices
} = require("../../controllers/adminController/offlineServiceController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const createUploader = require("../../middleware/uploadMiddleware");
const multerErrorHandler = require("../../middleware/multerErrorHandler");
const router = express.Router();

const upload = createUploader("offlineServices", /jpeg|jpg|png|pdf/, 15)

router.get(
    "/list-offline-service",
    authenticateUser,
    authorizeRoles("admin"),
    listAllOfflineServices
);

router.post(
    "/create-offline-service",
    authenticateUser,
    authorizeRoles("admin"),
    multerErrorHandler(upload.single("offlineServiceImage")),
    createOfflineService,
);

module.exports = router;

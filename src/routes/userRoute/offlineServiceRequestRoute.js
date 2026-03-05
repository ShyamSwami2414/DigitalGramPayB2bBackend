const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { createOfflineServiceRequest } = require("../../controllers/userController/offlineServiceRequestController");
const createUploader = require("../../middleware/uploadMiddleware");
const multerErrorHandler = require("../../middleware/multerErrorHandler");
const router = express.Router();

const upload = createUploader("offlineServiceRequest", /jpeg|jpg|png|pdf/, 15)

router.post(
    "/create-offline-service-request",
    authenticateUser,
    multerErrorHandler(upload.any()),
    createOfflineServiceRequest
)

module.exports = router;


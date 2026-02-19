const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");

const { getAllOfflineTopupRequests, addOfflineTopupRequest } = require("../../controllers/userController/offlineTopupRequestController");
const createUploader = require("../../middleware/uploadMiddleware");
const multerErrorHandler = require("../../middleware/multerErrorHandler");

const router = express.Router();

const upload = createUploader("paymentProof", /jpeg|jpg|png|pdf/, 5);

router.get(
    "/get-all-offline-topup-requests",
    authenticateUser,
    getAllOfflineTopupRequests
);

router.post(
    "/add-offline-topup-request",
    authenticateUser,
    multerErrorHandler(upload.single("paymentProof")),
    addOfflineTopupRequest
);

module.exports = router;
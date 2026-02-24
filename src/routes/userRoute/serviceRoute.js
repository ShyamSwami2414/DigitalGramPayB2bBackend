const express = require("express");
const { getServiceList } = require("../../controllers/userController/serviceController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const router = express.Router();

router.get(
    "/all-service-list",
    authenticateUser,
    getServiceList,
);

module.exports = router;
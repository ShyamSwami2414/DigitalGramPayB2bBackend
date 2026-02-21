const express = require("express");
const router = express.Router();

const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { getEnquiries } = require("../../controllers/adminController/enquiryController");

router.get("/all-enquiries",
    authenticateUser,
    authorizeRoles("admin"),
    getEnquiries
);

module.exports = router;
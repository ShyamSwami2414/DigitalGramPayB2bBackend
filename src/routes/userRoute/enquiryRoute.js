const express = require("express");
const router = express.Router();

const { createEnquiry } = require("../../controllers/userController/enquiryController");
const { authenticateUser } = require("../../middleware/authMiddleware");

router.post("/create-enquiry",
    authenticateUser,
    createEnquiry
);

module.exports = router;
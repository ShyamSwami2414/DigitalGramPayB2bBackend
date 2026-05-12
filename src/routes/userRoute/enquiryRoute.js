const express = require("express");
const router = express.Router();

const { createEnquiry } = require("../../controllers/userController/enquiryController");
const { authenticateUser } = require("../../middleware/authMiddleware");

const asyncHandler = require("../../utils/asyncHandler");

router.post("/create-enquiry",
    authenticateUser,
    asyncHandler(createEnquiry)
);

module.exports = router;
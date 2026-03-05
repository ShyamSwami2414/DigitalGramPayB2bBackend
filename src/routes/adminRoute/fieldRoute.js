const express = require("express");
const {
    getAllFieldOptionList

} = require("../../controllers/adminController/fieldController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.get(
    "/field-options",
    authenticateUser,
    authorizeRoles("admin"),
    getAllFieldOptionList,
);

module.exports = router;

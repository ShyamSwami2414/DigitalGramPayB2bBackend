const express = require("express");
const {
    getAllDocumentOptionList

} = require("../../controllers/adminController/documentController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const router = express.Router();

router.get(
    "/document-options",
    authenticateUser,
    authorizeRoles("admin"),
    getAllDocumentOptionList
    ,
);

module.exports = router;

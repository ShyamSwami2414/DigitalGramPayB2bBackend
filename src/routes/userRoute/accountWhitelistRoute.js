const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { getAccountWhitelist, addAccountWhitelist } = require("../../controllers/userController/accountWhitelistController");
const createUploader = require("../../middleware/uploadMiddleware");
const multerErrorHandler = require("../../middleware/multerErrorHandler");
const router = express.Router();

const upload = createUploader("accountWhitelist", /jpeg|jpg|png|pdf/, 15);

router.get(
    "/",
    authenticateUser,
    getAccountWhitelist
);

//add-account-whitelist
router.post(
    "/",
    authenticateUser,
    multerErrorHandler(upload.fields([
        { name: "chequeImage", maxCount: 1 },
        { name: "passbookOrBankStatement", maxCount: 1 },
    ])),

    addAccountWhitelist
);

module.exports = router;

const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { addAepsPayoutBank, getAepsPayoutBanks, getApprovedAepsBankList, deleteAepsPayoutBank } = require("../../controllers/userController/aepsPayoutBankController");
const router = express.Router();

// get all list whether approved or not
router.get(
    "/aeps-payout-banks",
    authenticateUser,
    getAepsPayoutBanks
);

// get only approved list for select bar
router.get(
    "/approved-aeps-banks",
    authenticateUser,
    getApprovedAepsBankList
);

router.post(
    "/add-aeps-payout-bank",
    authenticateUser,
    addAepsPayoutBank
);

router.delete(
    "/delete-aeps-payout-bank/:id",
    authenticateUser,
    deleteAepsPayoutBank
);

module.exports = router;
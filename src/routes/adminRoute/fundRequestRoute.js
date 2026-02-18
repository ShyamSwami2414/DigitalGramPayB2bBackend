const express = require("express")
const { fundRequestStats, getAllFundRequests } = require("../../controllers/adminController/fundRequestController")
const { authenticateUser } = require("../../middleware/authMiddleware")
const { authorizeRoles } = require("../../middleware/roleMiddleware")
const router = express.Router()

router.get("/get-fund-requests",
    authenticateUser,
    authorizeRoles("admin"),
    getAllFundRequests
)

router.get("/stats", authenticateUser, authorizeRoles("admin"), fundRequestStats)

module.exports = router
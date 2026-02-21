const express = require("express")
const { fundRequestStats, getAllFundRequests, approveFundRequest, rejectFundRequest } = require("../../controllers/adminController/fundRequestController")
const { authenticateUser } = require("../../middleware/authMiddleware")
const { authorizeRoles } = require("../../middleware/roleMiddleware")
const router = express.Router()

router.get("/get-fund-requests",
    authenticateUser,
    authorizeRoles("admin"),
    getAllFundRequests
)

router.get("/stats", authenticateUser, authorizeRoles("admin"), fundRequestStats)

router.patch(
    "/approve-fund-request/:id",
    authenticateUser,
    authorizeRoles("admin"),
    approveFundRequest
)

router.patch(
    "/reject-fund-request/:id",
    authenticateUser,
    authorizeRoles("admin"),
    rejectFundRequest
)
module.exports = router
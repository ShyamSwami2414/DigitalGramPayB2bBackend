const express = require("express");
const { getAllPackages } = require("../../controllers/userController/packageController");
const router = express.Router();

router.get("/get-packages", getAllPackages)

module.exports = router;
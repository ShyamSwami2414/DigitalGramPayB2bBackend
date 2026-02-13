const express = require("express");
const {
  createPackage,
  getAllPackages,
} = require("../../controllers/adminController/packageController");
const router = express.Router();

router.post("/create-package", createPackage);
router.post("/get-packages", getAllPackages);

module.exports = router;

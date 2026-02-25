const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { getProductList, getProductById } = require("../../controllers/userController/ecommerceController");
const router = express.Router();

router.get(
    "/product/:id",
    authenticateUser,
    getProductById
);

router.get(
    "/product-list",
    authenticateUser,
    getProductList
);

module.exports = router;

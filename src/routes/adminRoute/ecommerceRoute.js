const express = require("express");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { getProductList, addProduct, updateProduct, deleteProduct, getProductById } = require("../../controllers/adminController/ecommerceController");
const createUploader = require("../../middleware/uploadMiddleware");
const multerErrorHandler = require("../../middleware/multerErrorHandler");
const router = express.Router();

const upload = createUploader("products", /jpeg|jpg|png/, 5);

router.get(
    "/product/:id",
    authenticateUser,
    authorizeRoles("admin"),
    getProductById
);

router.get(
    "/product-list",
    authenticateUser,
    authorizeRoles("admin"),
    getProductList
);

router.post(
    "/add-product",
    authenticateUser,
    authorizeRoles("admin"),
    multerErrorHandler(upload.single("productImage")),
    addProduct
);

router.put(
    "/update-product/:id",
    authenticateUser,
    authorizeRoles("admin"),
    multerErrorHandler(upload.single("productImage")),
    updateProduct
);

router.delete(
    "/delete-product/:id",
    authenticateUser,
    authorizeRoles("admin"),
    deleteProduct
);

module.exports = router;

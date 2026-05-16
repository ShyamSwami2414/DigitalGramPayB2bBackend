const express = require("express");
const {
  createDocument,
  getAllDocumentOptionList,
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
} = require("../../controllers/adminController/documentController");
const { authenticateUser } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const checkAllowedPermission = require("../../middleware/adminPermissionCheck");
const asyncHandler = require("../../utils/asyncHandler");
const router = express.Router();

//get list
router.get(
  "/document-options",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("OFFLINE_SERVICE"),
  asyncHandler(getAllDocumentOptionList),
);

router.post(
  "/create",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("OFFLINE_SERVICE"),
  asyncHandler(createDocument),
);

// router.get(
//   "/",
//   authenticateUser,
//   authorizeRoles("admin"),
//   checkAllowedPermission("OFFLINE_SERVICE"),
//   asyncHandler(getAllDocuments),
// );

// GET SINGLE
router.get(
  "/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("OFFLINE_SERVICE"),
  asyncHandler(getDocumentById),
);

// UPDATE
// router.put(
//   "/update/:id",
//   authenticateUser,
//   authorizeRoles("admin"),
//   checkAllowedPermission("OFFLINE_SERVICE"),
//   asyncHandler(updateDocument),
// );

// DELETE
router.delete(
  "/delete/:id",
  authenticateUser,
  authorizeRoles("admin"),
  checkAllowedPermission("OFFLINE_SERVICE"),
  asyncHandler(deleteDocument),
);

module.exports = router;

module.exports = router;

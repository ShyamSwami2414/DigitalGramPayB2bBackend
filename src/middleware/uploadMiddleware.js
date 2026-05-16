const multer = require("multer");
const path = require("path");
const fs = require("fs");

const createUploader = (
  folderName = "others",
  allowedTypes = /jpeg|jpg|png|pdf/,
  maxSizeKB = 1024, // default 1MB
) => {
  const uploadPath = path.join(process.cwd(), `uploads/${folderName}`);

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadPath);
    },

    filename: function (req, file, cb) {
      const uniqueName =
        Date.now() + "-" + file.fieldname + path.extname(file.originalname);
      cb(null, uniqueName);
    },
  });

  const fileFilter = (req, file, cb) => {
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSizeKB * 1024 }, // ✅ KB → bytes
  });
};

module.exports = createUploader;

// const createUploader = (
//   folderName = "others",
//   allowedTypes = /jpeg|jpg|png|pdf/,
//   maxSizeMB = 15
// ) => {
//   const uploadPath = path.join(process.cwd(), `uploads/${folderName}`);

//   if (!fs.existsSync(uploadPath)) {
//     fs.mkdirSync(uploadPath, { recursive: true });
//   }

//   const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, uploadPath);
//     },

//     filename: function (req, file, cb) {
//       const uniqueName =
//         Date.now() +
//         "-" +
//         file.fieldname +
//         path.extname(file.originalname);
//       cb(null, uniqueName);
//     },
//   });

//   const fileFilter = (req, file, cb) => {
//     const extname = allowedTypes.test(
//       path.extname(file.originalname).toLowerCase()
//     );
//     const mimetype = allowedTypes.test(file.mimetype);

//     if (extname && mimetype) {
//       cb(null, true);
//     } else {
//       cb(new Error("File type not allowed"), false);
//     }
//   };

//   return multer({
//     storage,
//     fileFilter,
//     limits: { fileSize: maxSizeMB * 1024 * 1024 },
//   });
// };

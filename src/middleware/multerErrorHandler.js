const multer = require("multer");

const multerErrorHandler = (upload) => {
  return (req, res, next) => {
    upload(req, res, function (err) {
      if (!err) return next();

      console.error("Multer Error:", err);

      // Handle multer built-in errors
      if (err instanceof multer.MulterError) {
        let message = err.message;

        switch (err.code) {
          case "LIMIT_FILE_SIZE":
            message = "File size exceeds allowed limit";
            break;

          case "LIMIT_FILE_COUNT":
            message = "Too many files uploaded";
            break;

          case "LIMIT_UNEXPECTED_FILE":
            message = `Unexpected field: ${err.field}`;
            break;

          case "LIMIT_PART_COUNT":
            message = "Too many parts in form data";
            break;

          case "LIMIT_FIELD_KEY":
            message = "Field name too long";
            break;

          case "LIMIT_FIELD_VALUE":
            message = "Field value too long";
            break;

          case "LIMIT_FIELD_COUNT":
            message = "Too many form fields";
            break;
        }

        return res.status(400).json({
          success: false,
          message,
        });
      }

      // Handle custom fileFilter errors
      return res.status(400).json({
        success: false,
        message: err.message || "File upload failed",
      });
    });
  };
};

module.exports = multerErrorHandler;

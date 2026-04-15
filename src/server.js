const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const cors = require("cors");
const path = require("path");
const dbConnection = require("../src/config/dbConfig");
const errorHandler = require("./middleware/errorHandler");

dbConnection();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, "../public")));

// Serve user uploads
console.log("path", path.join(__dirname, "../uploads"))

app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
      }
      res.setHeader("Access-Control-Allow-Origin", "*");
    },
  }),
);

// Register API routes before fallback
require("../src/routes/adminRoute/index")(app);
require("../src/routes/userRoute/index")(app);

app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is listening on PORT : ${PORT}`);
});


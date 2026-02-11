const mongoose = require("mongoose");

const dbConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connected !");
  } catch (error) {
    console.log(error.message,"Database connection failed !");
    process.exit(1);
  }
};

module.exports = dbConnection;

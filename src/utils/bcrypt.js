const bcrypt = require("bcrypt");

exports.hashPassword = async (password) => {
  try {
    const stringPassword = String(password);
    const hashedPassword = await bcrypt.hash(stringPassword, 10);
    return hashedPassword;
  } catch (error) {
    console.error("Bcrypt error:", error);
    throw new Error("Error hashing password");
  }
};

exports.comparePassword = async (plainPassword, hashedPassword) => {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    throw new Error("Error Comparing password");
  }
};

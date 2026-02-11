const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET ;
const JWT_EXPIRES = "7d"; // token validity

exports.generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });
};


exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.log(error)
    return null;
  }
};
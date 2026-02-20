const Role = require("../models/roleModel");
const User = require("../models/userModel");
const Admin = require("../models/adminModel");
const { verifyToken } = require("../utils/jwt");

const authenticateUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      console.log("Access Token not Provided");
      return res
        .status(401)
        .json({ success: false, message: "Access Token not Provided" });
    }

    const verifiedToken = await verifyToken(token);

    if (!verifiedToken) {
      console.log("Invalid Token");
      return res.status(401).json({ success: false, message: "Invalid Token" });
    }

    const [user, admin] = await Promise.all([
      User.findById(verifiedToken.id),
      Admin.findById(verifiedToken.id),
    ])

    if (!user && !admin) {
      console.log("User not found");
      return res.status(401).json({
        success: false,
        message: "User not found , Provide Valid Token"
      });
    }

    req.user = verifiedToken;

    next();
  } catch (error) {
    console.log(error);
    return res
      .status(401)
      .json({ success: false, message: "Token Validation Error" });
  }
};

module.exports = { authenticateUser };

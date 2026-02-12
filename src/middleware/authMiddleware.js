const Role = require("../models/roleModel");
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

    // let roles = await Role.find(
    //   { _id: { $in: verifiedToken.roleIds } },
    //   { name: 1 }
    // );

    // verifiedToken.roles = roles.map((role) => role.name);

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
